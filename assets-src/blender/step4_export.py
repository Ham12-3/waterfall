# Step 4: budget report and Draco glb export.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import os

import cascade_lib as L

importlib.reload(L)
import bpy

OUT = os.path.join(L.ROOT, "public", "assets", "models", "level.glb")

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
visual = [o for o in meshes if not o.name.endswith("_COL")]
over = [(o.name, L.tri_count(o.data)) for o in visual if o.name.startswith(("Ledge_", "Stone_", "Boulder_")) and L.tri_count(o.data) > 2000]
print("objects:", len(meshes), "| visual:", len(visual), "| colliders:", len(meshes) - len(visual))
print("total visual tris:", sum(L.tri_count(o.data) for o in visual), "(budget 150000)")
print("unique meshes:", len({o.data.name for o in visual}), "| rocks over 2k tris:", over or "none")
print("images:", [(i.name, tuple(i.size)) for i in bpy.data.images if i.size[0]])

bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_extras=True,  # custom properties -> userData (surface, checkpoint, finish)
    export_image_format="WEBP",
    export_image_quality=82,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
print("exported:", OUT, "|", round(os.path.getsize(OUT) / 1024), "KB")
print("saved:", L.save())
