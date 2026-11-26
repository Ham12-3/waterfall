"""Talk to the running Blender through the "MCP for Blender" addon's local socket.

    python tools/bl.py run <script.py>     execute a Python file inside Blender
    python tools/bl.py shot <out.png>      save a viewport screenshot
    python tools/bl.py cmd <type> [json]   send any raw addon command

The Blender MCP server is a relay to this same socket (127.0.0.1:9876), so this
does exactly what the MCP tools do.
"""
import json
import socket
import sys

HOST, PORT = "127.0.0.1", 9876


def send(command_type, params=None, timeout=300):
    with socket.create_connection((HOST, PORT), timeout=10) as sock:
        sock.sendall(json.dumps({"type": command_type, "params": params or {}}).encode())
        sock.settimeout(timeout)
        buffer = b""
        while True:
            chunk = sock.recv(1 << 16)
            if not chunk:
                break
            buffer += chunk
            try:
                return json.loads(buffer.decode())
            except ValueError:
                continue
    raise RuntimeError("Blender closed the connection without a full reply")


def main():
    mode = sys.argv[1]
    if mode == "run":
        with open(sys.argv[2], encoding="utf-8") as handle:
            reply = send("execute_code", {"code": handle.read()})
    elif mode == "shot":
        reply = send("get_viewport_screenshot", {"max_size": 1100, "filepath": sys.argv[2], "format": "png"})
    else:
        reply = send(sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else {})

    if reply.get("status") != "success":
        print("ERROR:", reply.get("message") or json.dumps(reply)[:2000])
        sys.exit(1)
    result = reply.get("result")
    if isinstance(result, dict) and "result" in result:
        print(result["result"])
    else:
        print(json.dumps(result, indent=1)[:4000])


if __name__ == "__main__":
    main()
