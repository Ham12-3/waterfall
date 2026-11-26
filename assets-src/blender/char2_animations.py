# Character step 2: import the five Mixamo clips and attach them to the one
# armature as separate, named actions (each on its own NLA track for glTF).
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import os

import cascade_lib as L

importlib.reload(L)
import bpy

MIXAMO = os.path.join(L.ROOT, "assets-src", "raw", "mixamo")
CLIPS = {"Idle": "Idle.fbx", "Run": "Run.fbx", "Jump": "Jump.fbx", "Fall": "Falling.fbx", "Land": "Landing.fbx"}

scene = bpy.data.scenes["Character"]
bpy.context.window.scene = scene
armature = bpy.data.objects["Character_Armature"]


def fcurves_of(action):
    """All F-curves of an action, across Blender's layered action structure."""
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


for name in CLIPS:
    stale = bpy.data.actions.get(name)
    if stale:
        bpy.data.actions.remove(stale)

actions = {}
for name, filename in CLIPS.items():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(MIXAMO, filename))
    imported = [o for o in bpy.data.objects if o not in before]
    rig = next(o for o in imported if o.type == "ARMATURE")
    action = rig.animation_data.action
    action.name = name
    action.use_fake_user = True
    actions[name] = action
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)

    start, end = action.frame_range
    hips = {}
    for fc in fcurves_of(action):
        if fc.data_path.endswith('"mixamorig:Hips"].location'):
            values = [k.co[1] for k in fc.keyframe_points]
            hips[fc.array_index] = (round(min(values), 2), round(max(values), 2))
    print(f"{name}: frames {start:.0f}-{end:.0f} | hips location range per axis: {hips}")

# One NLA track per clip, which is how the glTF exporter finds separate animations.
anim = armature.animation_data or armature.animation_data_create()
anim.action = None
for track in list(anim.nla_tracks):
    anim.nla_tracks.remove(track)
for name, action in actions.items():
    track = anim.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, int(action.frame_range[0]), action)
    strip.name = name
    try:
        if action.slots and strip.action_slot is None:
            strip.action_slot = action.slots[0]
    except Exception as error:  # older/newer API differences
        print("slot note:", error)
    track.mute = True

print("actions:", [a.name for a in bpy.data.actions], "| NLA tracks:", [t.name for t in anim.nla_tracks])
print("saved:", L.save())
