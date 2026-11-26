"""Shared helpers for building the Cascade level in Blender.

Game space is Y-up (x right, y up, z towards the camera). Blender is Z-up, and
the glTF exporter maps Blender (x, y, z) to glTF (x, z, -y). So a game point
(x, y, z) is authored in Blender at (x, -z, y); use g() for every position.
"""
import json
import math
import os

import bmesh
import bpy
from mathutils import Euler, Vector, noise

ROOT = r"C:\Users\mobol\Downloads\waterfall"
TEXTURES = os.path.join(ROOT, "public", "assets", "textures")
BLEND_PATH = os.path.join(ROOT, "assets-src", "blender", "cascade.blend")

with open(os.path.join(ROOT, "assets-src", "level_layout.json"), encoding="utf-8") as _f:
    LAYOUT = json.load(_f)
BLOCKS = {b["name"]: b for b in LAYOUT["blocks"]}


def g(x, y, z):
    """Game-space point -> Blender-space vector."""
    return Vector((x, -z, y))


def collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def link(obj, col_name):
    collection(col_name).objects.link(obj)
    return obj


def remove_object(name):
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)


def new_object(name, mesh, col_name, location=(0, 0, 0)):
    remove_object(name)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    return link(obj, col_name)


def mesh_from_bmesh(name, bm, smooth=True):
    old = bpy.data.meshes.get(name)
    if old:
        bpy.data.meshes.remove(old)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    mesh.update()
    return mesh


def tri_count(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


# ---------------------------------------------------------------- materials


def material(name, texture=None, roughness=0.9, color=(0.8, 0.8, 0.8, 1.0)):
    """Principled material with an optional base colour texture (glTF friendly)."""
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (300, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Base Color"].default_value = color
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    if texture:
        tex = nodes.new("ShaderNodeTexImage")
        tex.location = (-320, 0)
        path = os.path.join(TEXTURES, texture)
        tex.image = bpy.data.images.get(texture) or bpy.data.images.load(path)
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


# -------------------------------------------------------------------- rocks


def make_rock_mesh(name, sx, sy, thick, seed, segs=12, margin=0.12, cuts=2):
    """Flat-topped boulder. Origin is the centre of the top face.

    sx, sy are the footprint the player can stand on (the box collider's size);
    the rock overhangs it by `margin`. Slot 0 is the top, slot 1 the sides.
    """
    bm = bmesh.new()
    off = Vector((seed * 3.17, seed * 1.31, seed * 0.73))

    def ring(scale, z, jitter):
        verts = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            c, s = math.cos(a), math.sin(a)
            r = (abs(c) ** 4 + abs(s) ** 4) ** -0.25  # superellipse: a rounded box
            j = 1 + jitter * noise.noise(Vector((c * 1.3, s * 1.3, z)) + off)
            verts.append(bm.verts.new((c * r * (sx / 2 + margin) * scale * j, s * r * (sy / 2 + margin) * scale * j, z)))
        return verts

    rings = [ring(0.84, 0.0, 0.03), ring(1.0, -0.07, 0.07), ring(1.04, -thick * 0.45, 0.16), ring(0.7, -thick, 0.22)]
    top = bm.verts.new((0, 0, 0))
    bottom = bm.verts.new((0, 0, -thick * 1.1))
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((top, rings[0][i], rings[0][j]))
        for r in range(len(rings) - 1):
            bm.faces.new((rings[r][i], rings[r + 1][i], rings[r + 1][j], rings[r][j]))
        bm.faces.new((bottom, rings[-1][j], rings[-1][i]))

    for _ in range(cuts):
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True, smooth=0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()

    # Rough the sides up; keep the top nearly flat so it matches its collider.
    for v in bm.verts:
        on_top = v.co.z > -0.03
        d = noise.noise(v.co * 1.5 + off) * 0.6 + noise.noise(v.co * 4.0 + off) * 0.4
        v.co += v.normal * d * (0.02 if on_top else 0.17)
        if on_top:
            v.co.z = min(v.co.z, 0.0)
    bm.normal_update()

    uv = bm.loops.layers.uv.new("UVMap")
    k = 0.4
    for f in bm.faces:
        is_top = f.normal.z > 0.6
        f.material_index = 0 if is_top else 1
        for loop in f.loops:
            co = loop.vert.co
            if abs(f.normal.z) > 0.6:
                loop[uv].uv = (co.x * k, co.y * k)
            elif abs(f.normal.x) > abs(f.normal.y):
                loop[uv].uv = (co.y * k, co.z * k)
            else:
                loop[uv].uv = (co.x * k, co.z * k)
    return mesh_from_bmesh(name, bm)


def set_rock_materials(obj, top_mat, side_mat):
    """Per-object material slots, so instances of one mesh can differ."""
    mesh = obj.data
    while len(mesh.materials) < 2:
        mesh.materials.append(None)
    for index, mat in enumerate((top_mat, side_mat)):
        obj.material_slots[index].link = "OBJECT"
        obj.material_slots[index].material = mat


# ---------------------------------------------------------------- colliders


def collider(block):
    """Box collider for Rapier: a unit cube scaled to the block's size, with the
    surface data the game needs stored as custom properties (glTF extras)."""
    cube = bpy.data.meshes.get("COL_Cube")
    if cube is None:
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        cube = mesh_from_bmesh("COL_Cube", bm, smooth=False)
    name = block["name"] + "_COL"
    obj = new_object(name, cube, "Colliders", g(*block["position"]))
    sx, sy, sz = block["size"]
    obj.scale = (sx, sz, sy)
    obj.display_type = "WIRE"
    obj.hide_render = True
    obj["surface"] = block.get("surface", "default")
    if block.get("checkpoint") is not None:
        obj["checkpoint"] = int(block["checkpoint"])
    if block.get("finish"):
        obj["finish"] = True
    return obj


def top_centre(block):
    x, y, z = block["position"]
    return g(x, y + block["size"][1] / 2, z)


# --------------------------------------------------------------------- view


def set_view(target, distance, pitch_deg=65, yaw_deg=0, shading="MATERIAL"):
    """Aim every 3D viewport at a game-space point. yaw 0 looks at the cliff."""
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.shading.type = shading
            space.overlay.show_floor = False
            space.overlay.show_axis_x = space.overlay.show_axis_y = False
            r3d = space.region_3d
            r3d.view_perspective = "PERSP"
            r3d.view_location = g(*target)
            r3d.view_distance = distance
            r3d.view_rotation = Euler((math.radians(pitch_deg), 0, math.radians(yaw_deg)), "XYZ").to_quaternion()


def save():
    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    return BLEND_PATH
