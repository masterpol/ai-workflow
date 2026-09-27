"""Scratch-only Unix experiments; never import this into production writers."""
import errno
import json
import os
import platform
import select
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

try:
    import fcntl
except ImportError:
    fcntl = None

DEADLINE = 5


def line(stream):
    end = time.monotonic() + DEADLINE
    data = b""
    while not data.endswith(b"\n"):
        remaining = end - time.monotonic()
        if remaining <= 0 or not select.select([stream], [], [], remaining)[0]:
            raise TimeoutError("barrier")
        chunk = os.read(stream.fileno(), 1)
        if not chunk or len(data) >= 100:
            raise RuntimeError("barrier protocol")
        data += chunk
    return data.decode().strip()


def eof(stream):
    if not select.select([stream], [], [], DEADLINE)[0]:
        raise TimeoutError("lifetime")
    assert os.read(stream.fileno(), 1) == b""


def lock(path):
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fd
    except BlockingIOError:
        os.close(fd)
        return None
    except BaseException:
        os.close(fd)
        raise


def worker(path):
    fd = lock(path)
    assert fd is not None
    print("READY", flush=True)
    try:
        sys.stdin.buffer.read(1)  # EOF is the supervisor lifetime protocol.
    finally:
        os.close(fd)


def spawn(mode, path):
    return subprocess.Popen([sys.executable, __file__, mode, str(path)],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE)


def stop(proc):
    if proc.poll() is None:
        proc.kill()
    proc.wait(timeout=DEADLINE)
    proc.stdin.close()
    proc.stdout.close()


def parent(path):
    child = subprocess.Popen([sys.executable, __file__, "orphan-holder", path],
                             stdin=subprocess.PIPE, stdout=sys.stdout)
    try:
        print(child.pid, flush=True)
        child.stdin.write(b"1")
        child.stdin.flush()
        assert sys.stdin.buffer.read(1) == b"S"
        os.kill(child.pid, signal.SIGSTOP)
        assert os.WIFSTOPPED(os.waitpid(child.pid, os.WUNTRACED)[1])
        print("STOPPED", flush=True)
        sys.stdin.buffer.read(1)
    finally:
        if child.poll() is None:
            child.kill()
        child.wait(timeout=DEADLINE)
        child.stdin.close()


def path_cases(base):
    root, outside = base / "root", base / "outside"
    root.mkdir()
    outside.mkdir()
    folder = root / "folder"
    folder.mkdir()
    (folder / "old").write_text("inside")
    (outside / "old").write_text("outside")
    fd = os.open(folder, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        # The open completed before this swap; subsequent operations use the fd.
        folder.rename(root / "captured")
        folder.symlink_to(outside, target_is_directory=True)
        new = os.open("new", os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                      0o600, dir_fd=fd)
        os.write(new, b"new")
        os.close(new)
        os.rename("new", "renamed", src_dir_fd=fd, dst_dir_fd=fd)
        os.unlink("old", dir_fd=fd)
        assert (root / "captured" / "renamed").read_text() == "new"
        assert sorted(p.name for p in outside.iterdir()) == ["old"]
        os.symlink(outside / "old", root / "captured" / "leaf")
        try:
            leaf = os.open("leaf", os.O_RDONLY | os.O_NOFOLLOW, dir_fd=fd)
        except OSError as error:
            assert error.errno == errno.ELOOP
        else:
            os.close(leaf)
            raise AssertionError("leaf symlink followed")
        (root / "captured").rename(outside / "moved")
        escaped = os.open("escape", os.O_WRONLY | os.O_CREAT | os.O_EXCL,
                          0o600, dir_fd=fd)
        os.close(escaped)
        assert (outside / "moved" / "escape").is_file()
        return {"ancestor_swap": "captured_inode_only", "leaf_symlink": "refused",
                "directory_move": "write_outside_root_demonstrated"}
    finally:
        os.close(fd)


def lock_cases(base):
    path = base / "lock"
    proc = spawn("holder", path)
    try:
        assert line(proc.stdout) == "READY"
        os.kill(proc.pid, signal.SIGSTOP)
        # waitpid confirms suspension rather than guessing from elapsed time.
        assert os.WIFSTOPPED(os.waitpid(proc.pid, os.WUNTRACED)[1])
        assert lock(path) is None
        proc.kill()
        proc.wait(timeout=DEADLINE)
        acquired = lock(path)
        assert acquired is not None
        os.close(acquired)
    finally:
        stop(proc)
    held = lock(path)
    assert held is not None
    try:
        path.unlink()
        replacement = lock(path)
        assert replacement is not None
        assert os.fstat(held).st_ino != os.fstat(replacement).st_ino
        os.close(replacement)
        # An old writer ignoring flock can still mutate while the lock is held.
        (base / "legacy-write").write_text("uncooperative")
        assert (base / "legacy-write").read_text() == "uncooperative"
    finally:
        os.close(held)
    supervisor = spawn("parent", path)
    helper_pid = None
    try:
        helper_pid = int(line(supervisor.stdout))
        assert line(supervisor.stdout) == "READY"
        supervisor.stdin.write(b"S")
        supervisor.stdin.flush()
        assert line(supervisor.stdout) == "STOPPED"
        supervisor.kill()
        supervisor.wait(timeout=DEADLINE)
        assert lock(path) is None
        os.kill(helper_pid, signal.SIGCONT)
        eof(supervisor.stdout)  # EOF waits for orphan helper to close descriptors.
        helper_pid = None
        acquired = lock(path)
        assert acquired is not None
        os.close(acquired)
    finally:
        if helper_pid is not None:
            os.kill(helper_pid, signal.SIGKILL)
        stop(supervisor)
    proc = spawn("holder", path)
    try:
        assert line(proc.stdout) == "READY"
        try:
            proc.wait(timeout=0.05)  # Deadline expiry, never a scheduling barrier.
            raise AssertionError("holder exited before timeout")
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=DEADLINE)
        acquired = lock(path)
        assert acquired is not None
        os.close(acquired)
    finally:
        stop(proc)
    return {"paused_holder": "contender_refused", "helper_death": "released",
            "parent_death": "held_until_helper_resumed_and_EOF_observed",
            "timeout_cleanup": "released", "inode_replacement": "split_locks_demonstrated",
            "legacy_writer": "cooperation_required"}


def run():
    started = time.monotonic()
    caps = {"dir_fd": all(fn in os.supports_dir_fd for fn in (os.open, os.rename, os.unlink)),
            "nofollow": hasattr(os, "O_NOFOLLOW"), "directory": hasattr(os, "O_DIRECTORY"),
            "flock": fcntl is not None and hasattr(fcntl, "flock"),
            "unix_process": os.name == "posix"}
    result = {"schema": 1, "host": platform.system(), "python": platform.python_version(),
              "capabilities": caps, "coverage": {"Darwin": "unverified", "Linux": "unverified"}}
    if all(caps.values()):
        with tempfile.TemporaryDirectory(prefix="native-safety-", dir=os.environ.get("NATIVE_SAFETY_TMP")) as name:
            base = Path(name)
            result["path"] = path_cases(base)
            result["lock"] = lock_cases(base)
        result["status"] = "observed"
        result["coverage"][platform.system()] = "observed"
        result["fixtures_removed"] = not base.exists()
    else:
        result["status"] = "unsupported"
    result["elapsed_ms"] = round((time.monotonic() - started) * 1000)
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    if len(sys.argv) == 1:
        run()
    elif sys.argv[1] == "holder":
        worker(sys.argv[2])
    elif sys.argv[1] == "parent":
        parent(sys.argv[2])
    elif sys.argv[1] == "orphan-holder":
        assert sys.stdin.buffer.read(1) == b"1"
        worker(sys.argv[2])
    else:
        raise ValueError("unsupported mode")
