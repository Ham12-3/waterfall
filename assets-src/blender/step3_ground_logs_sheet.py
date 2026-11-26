# Step 3: shore, pool basin floor, logs, and the curved waterfall sheet.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import math

import cascade_lib as L

importlib.reload(L)
import bmesh
import bpy
from mathutils import Vector, noise

M = bpy.data.materials


def grid_mesh(name, nx, ny, point, uv_of, mat):
    """A grid of quads. point(u, v) -> game-space (x, y, z); uv_of(u, v) -> (s, t)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    verts = [[bm.verts.new(L.g(*point(ix / nx, iy / ny))) for ix in range(nx + 1)] for iy in range(ny + 1)]
    for iy in range(ny):
        for ix in range(nx):
            corners = ((ix, iy), (ix + 1, iy), (ix + 1, iy + 1), (ix, iy + 1))
            face = bm.faces.new([verts[cy][cx] for cx, cy in corners])
            for loop, (cx, cy) in zip(face.loops, corners):
                loop[uv].uv = uv_of(cx / nx, cy / ny)
    mesh = L.mesh_from_bmesh(name, bm)
    mesh.materials.append(mat)
    return mesh


# ---- Shore: flat on top (matches its collider), with a lip dropping into the pool.
shore = L.BLOCKS["Shore"]
sx0, sx1 = -shore["size"][0] / 2, shore["size"][0] / 2
sz0 = shore["position"][2] - shore["size"][2] / 2  # pool edge
sz1 = shore["position"][2] + shore["size"][2] / 2


def shore_point(u, v):
    x = sx0 + (sx1 - sx0) * u
    if v < 0.2:  # first rows form the lip: from the pool floor up to the edge
        t = v / 0.2
        return (x, -2.2 + 2.2 * t, sz0 - 0.5 * (1 - t))
    return (x, 0.0, sz0 + (sz1 - sz0) * (v - 0.2) / 0.8)


mesh = grid_mesh("Shore", 20, 10, shore_point, lambda u, v: (u * 7, v * 3.5), M["M_PoolFloor"])
L.new_object("Shore", mesh, "Level")
L.collider(shore)

# ---- Pool floor: gently uneven pebble bed under the water.
floor = L.BLOCKS["Pool_Floor"]
fy = floor["position"][1] + floor["size"][1] / 2


def floor_point(u, v):
    x = -14 + 28 * u
    z = -3.6 + 7.8 * v
    return (x, fy + 0.25 * noise.noise(Vector((x * 0.3, z * 0.3, 5.0))) - 0.1, z)


mesh = grid_mesh("Pool_Basin", 22, 8, floor_point, lambda u, v: (u * 6, v * 1.7), M["M_PoolFloor"])
L.new_object("Pool_Basin", mesh, "Level")
L.collider(floor)


# ---- Logs: lie along X, origin at the centre. Bark grain runs along the length.
def make_log(name, length, radius, seed, sides=12, rings=6):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    off = Vector((seed * 2.3, seed * 0.7, 0))

    def r_at(i, s):
        a = 2 * math.pi * s / sides
        return radius * (1 + 0.1 * noise.noise(Vector((math.cos(a) * 1.5, math.sin(a) * 1.5, i * 0.6)) + off))

    def pos(i, s):
        a = 2 * math.pi * s / sides
        r = r_at(i, s % sides)
        x = -length / 2 + length * i / rings
        sag = 0.06 * math.sin(math.pi * i / rings)  # slight bend
        return Vector((x, math.cos(a) * r, math.sin(a) * r - sag))

    ring_verts = [[bm.verts.new(pos(i, s)) for s in range(sides)] for i in range(rings + 1)]
    for i in range(rings):
        for s in range(sides):
            t = (s + 1) % sides
            face = bm.faces.new((ring_verts[i][s], ring_verts[i + 1][s], ring_verts[i + 1][t], ring_verts[i][t]))
            coords = ((s, i), (s, i + 1), (s + 1, i + 1), (s + 1, i))
            for loop, (cs, ci) in zip(face.loops, coords):
                loop[uv].uv = (cs / sides * 2.0, ci / rings * length * 0.5)
    for i, sign in ((0, -1), (rings, 1)):
        centre = bm.verts.new(Vector((sign * (length / 2 + 0.03), 0, 0)))
        for s in range(sides):
            t = (s + 1) % sides
            face = bm.faces.new((centre, ring_verts[i][s], ring_verts[i][t]))
            for loop in face.loops:
                loop[uv].uv = (0.5 + loop.vert.co.y * 0.4, 0.5 + loop.vert.co.z * 0.4)
    mesh = L.mesh_from_bmesh(name, bm)
    mesh.materials.append(M["M_Bark"])
    return mesh


# Parked floating in the pool; the game moves copies of them down the falls.
LOGS = (("Log_A", 3.2, 0.38, 1, (-9.5, -0.42, 1.6), 0.5), ("Log_B", 2.4, 0.32, 2, (9.0, -0.45, 2.4), -0.8))
log_tris = {}
for name, length, radius, seed, where, yaw in LOGS:
    mesh = make_log(name, length, radius, seed)
    obj = L.new_object(name, mesh, "Props", L.g(*where))
    obj.rotation_euler = (0, 0, yaw)
    obj["length"] = length
    obj["radius"] = radius
    log_tris[name] = L.tri_count(mesh)
    col = L.collider({"name": name, "position": list(where), "size": [length, radius * 1.7, radius * 1.7], "surface": "wet"})
    col.rotation_euler = (0, 0, yaw)

# ---- Waterfall sheet: bulges out in the middle and leans out towards the bottom.
# UVs are a clean 0..1 square with v = 1 at the top lip, for the scrolling shader.
W = L.LAYOUT["waterfall"]
BULGE, LEAN = 0.35, 0.7


def sheet_point(u, v):
    x = -W["width"] / 2 + W["width"] * u
    y = W["bottomY"] + (W["topY"] - W["bottomY"]) * v
    side = 2 * u - 1
    return (x, y, W["z"] + BULGE * (1 - side * side) + LEAN * (1 - v) ** 2)


mesh = grid_mesh("Waterfall_Sheet", 24, 32, sheet_point, lambda u, v: (u, v), M["M_Water"])
L.new_object("Waterfall_Sheet", mesh, "Water")

L.set_view((0, 7, 2), 40, pitch_deg=72, yaw_deg=22)

total = sum(L.tri_count(o.data) for o in bpy.data.objects if o.type == "MESH" and not o.name.endswith("_COL"))
colliders = sum(1 for o in bpy.data.objects if o.name.endswith("_COL"))
print("logs:", log_tris, "| sheet tris:", L.tri_count(mesh))
print("level tris (visual, instances counted):", total, "| colliders:", colliders)
print("saved:", L.save())
