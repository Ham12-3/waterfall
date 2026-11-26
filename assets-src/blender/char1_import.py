# Character step 1: import the Mixamo character into its own scene and report on it.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import os

import cascade_lib as L

importlib.reload(L)
import bpy

MIXAMO = os.path.join(L.ROOT, "assets-src", "raw", "mixamo")

# A separate scene keeps the character out of the level export.
old = bpy.data.scenes.get("Character")
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(old)
scene = bpy.data.scenes.new("Character")
bpy.context.window.scene = scene
scene.unit_settings.system = "METRIC"

before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=os.path.join(MIXAMO, "Megan_TPose.fbx"))
new = [o for o in bpy.data.objects if o not in before]

armature = next(o for o in new if o.type == "ARMATURE")
armature.name = "Character_Armature"
meshes = [o for o in new if o.type == "MESH"]
print("armature scale:", tuple(round(s, 4) for s in armature.scale), "| bones:", len(armature.data.bones))
total = 0
for m in meshes:
    tris = L.tri_count(m.data)
    total += tris
    print("mesh:", m.name, "| tris:", tris, "| materials:", [s.material.name for s in m.material_slots if s.material])
print("total tris:", total, "(budget 15000)")

zs = [(m.matrix_world @ v.co).z for m in meshes for v in m.data.vertices]
print("height:", round(max(zs) - min(zs), 3), "m | feet at z =", round(min(zs), 3))
print("images:", [(i.name, tuple(i.size), "packed" if i.packed_file else i.filepath[-40:]) for i in bpy.data.images if i.size[0] and i.users])

L.set_view((0, 0.9, 0), 3.2, pitch_deg=82, yaw_deg=25)
print("saved:", L.save())
