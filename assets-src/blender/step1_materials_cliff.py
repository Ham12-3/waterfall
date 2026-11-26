# Step 1: clean scene, materials from the Flow textures, the cliff face.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib

import cascade_lib as L

importlib.reload(L)
import bmesh
import bpy
from mathutils import Vector, noise

# Start from an empty scene (removes the default cube, light and camera).
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for col in list(bpy.data.collections):
    bpy.data.collections.remove(col)
bpy.context.scene.unit_settings.system = "METRIC"

L.material("M_Basalt_Wet", "basalt.webp", roughness=0.22)
L.material("M_Basalt_Dry", "basalt.webp", roughness=0.95)
L.material("M_Moss", "moss.webp", roughness=1.0)
L.material("M_PoolFloor", "pool_floor.webp", roughness=0.85)
L.material("M_Bark", "bark.webp", roughness=0.85)
L.material("M_Water", None, roughness=0.1, color=(0.35, 0.65, 0.8, 1.0))

# ---- Cliff_Main: a displaced wall. Its surface only ever sinks *behind* the
# flat collider plane, so nothing visible sticks out past where the player stops.
block = L.BLOCKS["Cliff_Main"]
cx, cy, cz = block["position"]
sx, sy, sz = block["size"]
x0, x1 = cx - sx / 2, cx + sx / 2
y0, y1 = cy - sy / 2, cy + sy / 2
front = cz + sz / 2
back = cz - sz / 2
NX, NY = 46, 36

bm = bmesh.new()
uv = bm.loops.layers.uv.new("UVMap")
grid = []
for iy in range(NY + 1):
    row = []
    for ix in range(NX + 1):
        x = x0 + (x1 - x0) * ix / NX
        y = y0 + (y1 - y0) * iy / NY
        # Broad hollows plus vertical basalt columns.
        broad = 0.5 + 0.5 * noise.noise(Vector((x * 0.16, y * 0.12, 3.1)))
        columns = abs(noise.noise(Vector((x * 0.9, y * 0.07, 9.7))))
        fine = 0.5 + 0.5 * noise.noise(Vector((x * 0.7, y * 0.7, 1.3)))
        depth = 0.05 + broad * 0.55 + columns * 0.5 + fine * 0.15
        row.append(bm.verts.new(L.g(x, y, front - depth)))
    grid.append(row)
k = 0.22
for iy in range(NY):
    for ix in range(NX):
        face = bm.faces.new((grid[iy][ix], grid[iy][ix + 1], grid[iy + 1][ix + 1], grid[iy + 1][ix]))
        for loop in face.loops:
            loop[uv].uv = (loop.vert.co.x * k, loop.vert.co.z * k)
# Flat top running back from the lip.
top_back = [bm.verts.new(L.g(x0 + (x1 - x0) * ix / NX, y1, back)) for ix in range(NX + 1)]
for ix in range(NX):
    face = bm.faces.new((grid[NY][ix], grid[NY][ix + 1], top_back[ix + 1], top_back[ix]))
    for loop in face.loops:
        loop[uv].uv = (loop.vert.co.x * k, loop.vert.co.y * k)

mesh = L.mesh_from_bmesh("Cliff_Main", bm)
mesh.materials.append(bpy.data.materials["M_Basalt_Wet"])
L.new_object("Cliff_Main", mesh, "Level")
L.collider(block)

L.set_view((0, 8, -3), 46, pitch_deg=78)
print("Cliff_Main tris:", L.tri_count(mesh))
print("saved:", L.save())
