# Step 2: ledge rocks in five shared shapes, stepping stones, summit, banks, shore boulders.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import math

import cascade_lib as L

importlib.reload(L)
import bpy

M = bpy.data.materials
# Tops and sides must never share a material: the glTF exporter would then write
# an empty second primitive, which Draco cannot decode.
L.material("M_Basalt_WetTop", "basalt.webp", roughness=0.12)
L.material("M_Basalt_DryTop", "basalt.webp", roughness=0.8, color=(1, 1, 1, 1))
TOP = {"wet": M["M_Basalt_WetTop"], "moss": M["M_Moss"], "default": M["M_Basalt_DryTop"]}
SIDE = {"wet": M["M_Basalt_Wet"], "moss": M["M_Basalt_Dry"], "default": M["M_Basalt_Dry"]}

# One shape per footprint, so every ledge is an unscaled instance of a shared mesh.
SHAPES = {
    (2.6, 2.2): L.make_rock_mesh("Rock_A", 2.6, 2.2, 1.0, seed=1),
    (2.3, 2.2): L.make_rock_mesh("Rock_B", 2.3, 2.2, 0.9, seed=2),
    (2.0, 2.2): L.make_rock_mesh("Rock_C", 2.0, 2.2, 1.1, seed=3),
    (3.0, 2.2): L.make_rock_mesh("Rock_D", 3.0, 2.2, 1.0, seed=4),
    (1.7, 1.7): L.make_rock_mesh("Rock_E", 1.7, 1.7, 1.3, seed=5),
}
report = {m.name: L.tri_count(m) for m in SHAPES.values()}

count = 0
for name, block in L.BLOCKS.items():
    if not (name.startswith("Ledge_") or name.startswith("Stone_")):
        continue
    key = (round(block["size"][0], 1), round(block["size"][2], 1))
    obj = L.new_object(name, SHAPES[key], "Level", L.top_centre(block))
    # Alternate facing so repeated shapes do not read as copies.
    obj.rotation_euler = (0, 0, math.pi if count % 2 else 0)
    L.set_rock_materials(obj, TOP[block["surface"]], SIDE[block["surface"]])
    L.collider(block)
    count += 1

# Summit slab on top of the cliff (finish), and the two banks beside the pool.
for name, thick, seed, segs in (("Summit", 1.0, 11, 16), ("Bank_L", 3.0, 12, 16), ("Bank_R", 3.0, 13, 16)):
    block = L.BLOCKS[name]
    mesh = L.make_rock_mesh("Rock_" + name, block["size"][0], block["size"][2], thick, seed=seed, segs=segs, margin=0.3)
    obj = L.new_object(name, mesh, "Level", L.top_centre(block))
    L.set_rock_materials(obj, M["M_Moss"], M["M_Basalt_Dry"])
    L.collider(block)
    report[mesh.name] = L.tri_count(mesh)

# Shore boulders: scenery you can also stand on. (x, z, top height, yaw, shape)
BOULDERS = [
    (-9.5, 6.5, 0.9, 0.4, (1.7, 1.7)),
    (-12.5, 9.0, 1.2, 1.9, (2.0, 2.2)),
    (10.0, 7.0, 0.8, 2.6, (1.7, 1.7)),
    (13.0, 10.5, 1.3, 0.9, (2.3, 2.2)),
    (-6.5, 15.5, 0.7, 3.4, (1.7, 1.7)),
    (7.5, 16.0, 1.0, 5.1, (2.0, 2.2)),
]
for i, (x, z, top, yaw, key) in enumerate(BOULDERS, start=1):
    name = f"Boulder_{i:02d}"
    obj = L.new_object(name, SHAPES[key], "Level", L.g(x, top, z))
    obj.rotation_euler = (0, 0, yaw)
    L.set_rock_materials(obj, M["M_Moss"] if i % 2 else M["M_Basalt_DryTop"], M["M_Basalt_Dry"])
    # A slightly inset box, so the rotated rock still covers its collider.
    L.collider({"name": name, "position": [x, top / 2, z], "size": [key[0] * 0.8, top, key[1] * 0.8], "surface": "moss" if i % 2 else "default"})

L.set_view((0, 8, -1), 34, pitch_deg=80, yaw_deg=-18)
print("rock instances:", count + len(BOULDERS), "| tris per shape:", report)
print("saved:", L.save())
