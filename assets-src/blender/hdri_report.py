import bpy
for i in bpy.data.images:
    if i.name.lower().endswith((".hdr", ".exr")) or "stream" in i.name.lower():
        print("image:", i.name, tuple(i.size), "| path:", bpy.path.abspath(i.filepath), "| packed:", bool(i.packed_file))
print("world:", bpy.context.scene.world.name if bpy.context.scene.world else None)
