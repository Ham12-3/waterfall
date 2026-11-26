# Character step 3: make the clips game-ready, cut the mesh and textures down to
# budget, and export character.glb.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import os

import cascade_lib as L

importlib.reload(L)
import bpy

OUT = os.path.join(L.ROOT, "public", "assets", "models", "character.glb")
# Share of each part's triangles to keep. The body keeps the most, for the face and hands.
RATIOS = {"Body": 0.34, "Hair": 0.25, "Pants": 0.2, "Shirt": 0.2, "Sneakers": 0.2, "Eyelashes": 0.5}
MAX_TEXTURE = 1024

scene = bpy.data.scenes["Character"]
bpy.context.window.scene = scene
armature = bpy.data.objects["Character_Armature"]


def fcurves_of(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


# ---- Clips. Physics moves the player, so the hips must not rise on their own:
# Jump and Land keep their crouch (hips going down) but lose the upward travel.
for name in ("Jump", "Land"):
    for fc in fcurves_of(bpy.data.actions[name]):
        if fc.data_path.endswith('Hips"].location') and fc.array_index == 1:
            for key in fc.keyframe_points:
                if key.co[1] > 0:
                    key.co[1] = 0
                    key.handle_left[1] = min(key.handle_left[1], 0)
                    key.handle_right[1] = min(key.handle_right[1], 0)
            fc.update()
for action in list(bpy.data.actions):
    if action.name.startswith("Armature|"):
        bpy.data.actions.remove(action)  # empty take that came with the T-pose file

# ---- Mesh: decimate each part, then join into one object.
parts = [o for o in scene.objects if o.type == "MESH"]
before = sum(L.tri_count(o.data) for o in parts)
if len(parts) > 1:
    for obj in parts:
        ratio = next((r for key, r in RATIOS.items() if key in obj.name), 0.25)
        mod = obj.modifiers.new("Reduce", "DECIMATE")
        mod.ratio = ratio
        with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
            bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
            bpy.ops.object.modifier_apply(modifier=mod.name)
        print(f"  {obj.name}: {L.tri_count(obj.data)} tris (kept {ratio:.0%})")
    body = next(o for o in parts if "Body" in o.name)
    with bpy.context.temp_override(object=body, active_object=body, selected_objects=parts, selected_editable_objects=parts):
        bpy.ops.object.join()
    body.name = "Character"
    body.data.name = "Character"
mesh_obj = next(o for o in scene.objects if o.type == "MESH")
after = L.tri_count(mesh_obj.data)
print("triangles:", before, "->", after, "(budget 15000)")

# ---- Textures: 4K and 2K maps down to 1024.
used = set()
for slot in mesh_obj.material_slots:
    if slot.material and slot.material.use_nodes:
        for node in slot.material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                used.add(node.image)
                socket = [l.to_socket.name for l in node.outputs["Color"].links] + ["alpha:" + l.to_socket.name for l in node.outputs["Alpha"].links]
                print(f"  {slot.material.name}: {node.image.name} {tuple(node.image.size)} -> {socket}")
for image in used:
    if max(image.size) > MAX_TEXTURE:
        image.scale(MAX_TEXTURE, MAX_TEXTURE)

bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_active_scene=True,
    export_apply=False,
    export_yup=True,
    export_image_format="WEBP",
    export_image_quality=80,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_skins=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_force_sampling=True,
    export_optimize_animation_size=True,
    export_cameras=False,
    export_lights=False,
)
print("exported:", OUT, "|", round(os.path.getsize(OUT) / 1024), "KB")
L.set_view((0, 0.95, 0), 3.0, pitch_deg=82, yaw_deg=25)
print("saved:", L.save())
