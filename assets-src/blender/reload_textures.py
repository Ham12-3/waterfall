# Re-read texture files from disk after they were re-processed.
import bpy
for image in bpy.data.images:
    if image.filepath:
        image.reload()
print("reloaded:", [i.name for i in bpy.data.images if i.filepath])
