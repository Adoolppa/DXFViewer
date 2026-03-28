#pragma once
#include "dxf_parser.h"
#include <vector>
#include <string>
#include <unordered_map>

#ifdef __EMSCRIPTEN__
#include <GLES3/gl3.h>
#else
// Minimal stubs for non-Emscripten builds (parsing only)
typedef unsigned int  GLuint;
typedef int           GLint;
#endif

// ---------------------------------------------------------------------------
// 2D affine transform: world = M * local + t
//   world.x = a*lx + b*ly + tx
//   world.y = c*lx + d*ly + ty
// ---------------------------------------------------------------------------
struct Transform2D {
    float a=1, b=0, c=0, d=1;
    float tx=0, ty=0;
};

inline Transform2D compose(const Transform2D& outer, const Transform2D& inner) {
    return {
        outer.a * inner.a + outer.b * inner.c,
        outer.a * inner.b + outer.b * inner.d,
        outer.c * inner.a + outer.d * inner.c,
        outer.c * inner.b + outer.d * inner.d,
        outer.a * inner.tx + outer.b * inner.ty + outer.tx,
        outer.c * inner.tx + outer.d * inner.ty + outer.ty
    };
}

// ---------------------------------------------------------------------------
// Vertex layouts
// ---------------------------------------------------------------------------
struct LineVertex {
    float x, y;        // world coords  (20 bytes total)
    float r, g, b;
};

struct DotVertex {
    float x, y;        // world coords  (24 bytes total)
    float r, g, b;
    float size;        // point radius in screen pixels
};

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
class Renderer {
public:
    bool init(const std::string& canvasSelector);

    // Load (or reload) all geometry from a parsed DXFDocument.
    // Call after parseDXF and whenever layer visibility or colors change.
    void loadDocument(const DXFDocument& doc);

    void setLayerVisibility(const std::string& name, bool visible);
    void setLayerColor(const std::string& name, float r, float g, float b);

    // Update the viewport transform uniforms (called each frame on pan/zoom).
    void setViewTransform(float scale, float tx, float ty,
                          float width, float height, float docCy);

    void renderFrame();

    void setPointOpts(bool show,
                      float lineR, float lineG, float lineB, float lineSize,
                      float curveR, float curveG, float curveB, float curveSize);

private:
    // ---------- GL handles ----------
    GLuint m_lineProg = 0, m_dotProg = 0;
    GLuint m_lineVAO  = 0, m_lineVBO = 0;
    GLuint m_dotVAO   = 0, m_dotVBO  = 0;

    // Cached uniform locations (line shader)
    GLint m_uLScale=0, m_uLTx=0, m_uLTy=0, m_uLW=0, m_uLH=0, m_uLCy=0;
    // Cached uniform locations (dot shader)
    GLint m_uDScale=0, m_uDTx=0, m_uDTy=0, m_uDW=0, m_uDH=0, m_uDCy=0;

    // ---------- Tessellated geometry ----------
    std::vector<LineVertex> m_lineVerts;
    std::vector<DotVertex>  m_dotVerts;

    // ---------- View state ----------
    float m_scale=1, m_tx=0, m_ty=0, m_width=1, m_height=1, m_docCy=0;

    // ---------- Point rendering options ----------
    bool  m_showDots  = false;
    float m_lineR=0,   m_lineG=0,   m_lineB=0,   m_lineSize=2;
    float m_curveR=1,  m_curveG=0,  m_curveB=0,  m_curveSize=1;

    // ---------- Layer state ----------
    std::unordered_map<std::string, bool>                   m_layerVisible;
    std::unordered_map<std::string, std::array<float,3>>    m_layerCustomColor;
    const DXFDocument* m_doc = nullptr;

    // ---------- Internal helpers ----------
    GLuint compileProgram(const char* vs, const char* fs);
    void   tessellate();
    void   tessellateEntity(const Entity& e, const DXFDocument& doc,
                             const std::string& layerOverride,
                             float fr, float fg, float fb,
                             const Transform2D& xfm, int depth);
    void   uploadBuffers();
    Color  resolveColor(const Entity& e,
                        const std::string& layerOverride) const;
    bool   isLayerVisible(const std::string& name) const;

    // Tessellate an arc segment (in world coords) into m_lineVerts
    void   tessArc(double cx, double cy, double r,
                   double startRad, double sweepRad,
                   float fr, float fg, float fb,
                   const Transform2D& xfm);
};
