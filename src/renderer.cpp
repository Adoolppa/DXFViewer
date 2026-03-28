#include "renderer.h"
#include <cmath>
#include <algorithm>
#include <array>

#ifdef __EMSCRIPTEN__
#include <emscripten/html5.h>
#endif

static constexpr double PI = 3.14159265358979323846;
static constexpr int    ARC_SEGS = 64;

// ---------------------------------------------------------------------------
// GLSL shaders
// ---------------------------------------------------------------------------
static const char* kLineVS = R"(#version 300 es
precision highp float;
in vec2 a_pos;
in vec3 a_color;
uniform float u_scale;
uniform float u_tx;
uniform float u_ty;
uniform float u_width;
uniform float u_height;
uniform float u_docCy;
out vec3 v_color;
void main() {
    float cx  = a_pos.x * u_scale + u_tx;
    float cy  = -(a_pos.y - u_docCy) * u_scale + u_ty + u_height * 0.5;
    float ndcX =  (cx / u_width)  * 2.0 - 1.0;
    float ndcY = -((cy / u_height) * 2.0 - 1.0);
    gl_Position = vec4(ndcX, ndcY, 0.0, 1.0);
    v_color = a_color;
}
)";

static const char* kLineFS = R"(#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 fragColor;
void main() {
    fragColor = vec4(v_color, 1.0);
}
)";

static const char* kDotVS = R"(#version 300 es
precision highp float;
in vec2  a_pos;
in vec3  a_color;
in float a_size;
uniform float u_scale;
uniform float u_tx;
uniform float u_ty;
uniform float u_width;
uniform float u_height;
uniform float u_docCy;
out vec3 v_color;
void main() {
    float cx  = a_pos.x * u_scale + u_tx;
    float cy  = -(a_pos.y - u_docCy) * u_scale + u_ty + u_height * 0.5;
    float ndcX =  (cx / u_width)  * 2.0 - 1.0;
    float ndcY = -((cy / u_height) * 2.0 - 1.0);
    gl_Position  = vec4(ndcX, ndcY, 0.0, 1.0);
    gl_PointSize = a_size * 2.0;
    v_color = a_color;
}
)";

static const char* kDotFS = R"(#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 fragColor;
void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    if (dot(coord, coord) > 0.25) discard;
    fragColor = vec4(v_color, 1.0);
}
)";

// ---------------------------------------------------------------------------
// Shader compilation
// ---------------------------------------------------------------------------
#ifdef __EMSCRIPTEN__
static GLuint compileShader(GLenum type, const char* src) {
    GLuint s = glCreateShader(type);
    glShaderSource(s, 1, &src, nullptr);
    glCompileShader(s);
    return s;
}
#endif

GLuint Renderer::compileProgram(const char* vs, const char* fs) {
#ifdef __EMSCRIPTEN__
    GLuint v = compileShader(GL_VERTEX_SHADER,   vs);
    GLuint f = compileShader(GL_FRAGMENT_SHADER, fs);
    GLuint p = glCreateProgram();
    glAttachShader(p, v);
    glAttachShader(p, f);
    glLinkProgram(p);
    glDeleteShader(v);
    glDeleteShader(f);
    return p;
#else
    (void)vs; (void)fs;
    return 0;
#endif
}

// ---------------------------------------------------------------------------
// init  — create WebGL2 context, compile shaders, set up VAOs/VBOs
// ---------------------------------------------------------------------------
bool Renderer::init(const std::string& canvasSelector) {
#ifdef __EMSCRIPTEN__
    EmscriptenWebGLContextAttributes attrs;
    emscripten_webgl_init_context_attributes(&attrs);
    attrs.majorVersion = 2;
    attrs.minorVersion = 0;
    attrs.antialias    = true;
    attrs.alpha        = false;
    attrs.depth        = false;
    attrs.stencil      = false;

    EMSCRIPTEN_WEBGL_CONTEXT_HANDLE ctx =
        emscripten_webgl_create_context(canvasSelector.c_str(), &attrs);
    if (ctx <= 0) return false;
    emscripten_webgl_make_context_current(ctx);

    // Compile shaders
    m_lineProg = compileProgram(kLineVS, kLineFS);
    m_dotProg  = compileProgram(kDotVS,  kDotFS);

    // Cache uniform locations
    m_uLScale = glGetUniformLocation(m_lineProg, "u_scale");
    m_uLTx    = glGetUniformLocation(m_lineProg, "u_tx");
    m_uLTy    = glGetUniformLocation(m_lineProg, "u_ty");
    m_uLW     = glGetUniformLocation(m_lineProg, "u_width");
    m_uLH     = glGetUniformLocation(m_lineProg, "u_height");
    m_uLCy    = glGetUniformLocation(m_lineProg, "u_docCy");

    m_uDScale = glGetUniformLocation(m_dotProg, "u_scale");
    m_uDTx    = glGetUniformLocation(m_dotProg, "u_tx");
    m_uDTy    = glGetUniformLocation(m_dotProg, "u_ty");
    m_uDW     = glGetUniformLocation(m_dotProg, "u_width");
    m_uDH     = glGetUniformLocation(m_dotProg, "u_height");
    m_uDCy    = glGetUniformLocation(m_dotProg, "u_docCy");

    // Line VAO/VBO  (stride 20: x,y,r,g,b)
    glGenVertexArrays(1, &m_lineVAO);
    glGenBuffers(1, &m_lineVBO);
    glBindVertexArray(m_lineVAO);
    glBindBuffer(GL_ARRAY_BUFFER, m_lineVBO);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 20, (void*)0);
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 20, (void*)8);

    // Dot VAO/VBO  (stride 24: x,y,r,g,b,size)
    glGenVertexArrays(1, &m_dotVAO);
    glGenBuffers(1, &m_dotVBO);
    glBindVertexArray(m_dotVAO);
    glBindBuffer(GL_ARRAY_BUFFER, m_dotVBO);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 24, (void*)0);
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 24, (void*)8);
    glEnableVertexAttribArray(2);
    glVertexAttribPointer(2, 1, GL_FLOAT, GL_FALSE, 24, (void*)20);

    glBindVertexArray(0);
    glClearColor(0.067f, 0.067f, 0.067f, 1.0f);  // #111
    return true;
#else
    return false;
#endif
}

// ---------------------------------------------------------------------------
// Color resolution
// ---------------------------------------------------------------------------
Color Renderer::resolveColor(const Entity& e,
                              const std::string& layerOverride) const {
    int ci = e.colorIndex;
    if (ci == -1 || ci == 256) {
        // BYLAYER
        const std::string& lname = e.layer.empty() ? layerOverride : e.layer;
        // Check custom color override
        auto itC = m_layerCustomColor.find(lname);
        if (itC != m_layerCustomColor.end()) {
            auto& c = itC->second;
            return { (uint8_t)(c[0]*255), (uint8_t)(c[1]*255), (uint8_t)(c[2]*255) };
        }
        if (m_doc) {
            auto itL = m_doc->layers.find(lname);
            if (itL != m_doc->layers.end())
                ci = itL->second.colorIndex;
            else
                ci = 7;
        } else {
            ci = 7;
        }
    }
    if (ci <= 0) ci = 7;
    return aciToRGB(ci);
}

bool Renderer::isLayerVisible(const std::string& name) const {
    auto it = m_layerVisible.find(name);
    if (it != m_layerVisible.end()) return it->second;
    // Default: respect DXFDocument layer isOff flag
    if (m_doc) {
        auto itL = m_doc->layers.find(name);
        if (itL != m_doc->layers.end())
            return !itL->second.isOff;
    }
    return true;
}

// ---------------------------------------------------------------------------
// tessArc — tessellate arc segment into m_lineVerts
//   cx,cy,r in world coords; startRad, sweepRad in radians (CCW sweep)
// ---------------------------------------------------------------------------
void Renderer::tessArc(double cx, double cy, double r,
                        double startRad, double sweepRad,
                        float fr, float fg, float fb,
                        const Transform2D& xfm) {
    int n = std::max(2, (int)(std::abs(sweepRad) / (2*PI) * ARC_SEGS));
    for (int i = 0; i < n; ++i) {
        double a0 = startRad + sweepRad * ( i      / (double)n);
        double a1 = startRad + sweepRad * ((i + 1) / (double)n);
        float wx0 = (float)(cx + r * std::cos(a0));
        float wy0 = (float)(cy + r * std::sin(a0));
        float wx1 = (float)(cx + r * std::cos(a1));
        float wy1 = (float)(cy + r * std::sin(a1));
        // apply transform
        float px0 = xfm.a*wx0 + xfm.b*wy0 + xfm.tx;
        float py0 = xfm.c*wx0 + xfm.d*wy0 + xfm.ty;
        float px1 = xfm.a*wx1 + xfm.b*wy1 + xfm.tx;
        float py1 = xfm.c*wx1 + xfm.d*wy1 + xfm.ty;
        m_lineVerts.push_back({px0, py0, fr, fg, fb});
        m_lineVerts.push_back({px1, py1, fr, fg, fb});
    }
}

// ---------------------------------------------------------------------------
// tessellateEntity
// ---------------------------------------------------------------------------
void Renderer::tessellateEntity(const Entity& e, const DXFDocument& doc,
                                  const std::string& layerOverride,
                                  float fr, float fg, float fb,
                                  const Transform2D& xfm, int depth) {
    const std::string& lname = e.layer.empty() ? layerOverride : e.layer;
    if (!isLayerVisible(lname)) return;

    // Resolve entity color
    Color col = resolveColor(e, layerOverride);
    fr = col.r / 255.0f;
    fg = col.g / 255.0f;
    fb = col.b / 255.0f;

    // Helper: transform a world point
    auto tx = [&](double wx, double wy) -> std::pair<float,float> {
        float px = (float)(xfm.a * wx + xfm.b * wy) + xfm.tx;
        float py = (float)(xfm.c * wx + xfm.d * wy) + xfm.ty;
        return {px, py};
    };
    auto pushLine = [&](float x0,float y0,float x1,float y1) {
        m_lineVerts.push_back({x0,y0,fr,fg,fb});
        m_lineVerts.push_back({x1,y1,fr,fg,fb});
    };
    auto pushDot = [&](float px, float py, float dr, float dg, float db, float ds) {
        if (m_showDots) m_dotVerts.push_back({px,py,dr,dg,db,ds});
    };

    switch (e.type) {

    case EntityType::LINE: {
        auto& l = static_cast<const LineEntity&>(e);
        auto [x0,y0] = tx(l.x1, l.y1);
        auto [x1,y1] = tx(l.x2, l.y2);
        pushLine(x0,y0,x1,y1);
        pushDot(x0,y0, m_lineR,m_lineG,m_lineB, m_lineSize);
        pushDot(x1,y1, m_lineR,m_lineG,m_lineB, m_lineSize);
        break;
    }

    case EntityType::CIRCLE: {
        auto& c = static_cast<const CircleEntity&>(e);
        tessArc(c.cx, c.cy, c.r, 0, 2*PI, fr,fg,fb, xfm);
        break;
    }

    case EntityType::ARC: {
        auto& a = static_cast<const ArcEntity&>(e);
        double sweep = a.endAngle - a.startAngle;
        if (sweep <= 0.0) sweep += 360.0;
        double startRad = a.startAngle * PI / 180.0;
        double sweepRad = sweep        * PI / 180.0;
        tessArc(a.cx, a.cy, a.r, startRad, sweepRad, fr,fg,fb, xfm);
        if (m_showDots) {
            double eaRad = a.endAngle * PI / 180.0;
            auto [sx,sy] = tx(a.cx + a.r * std::cos(startRad),
                              a.cy + a.r * std::sin(startRad));
            auto [ex,ey] = tx(a.cx + a.r * std::cos(eaRad),
                              a.cy + a.r * std::sin(eaRad));
            pushDot(sx,sy, m_curveR,m_curveG,m_curveB, m_curveSize);
            pushDot(ex,ey, m_curveR,m_curveG,m_curveB, m_curveSize);
        }
        break;
    }

    case EntityType::LWPOLYLINE: {
        auto& p = static_cast<const LWPolylineEntity&>(e);
        int n = (int)p.vertices.size();
        if (n < 2) break;
        int segs = p.closed ? n : n - 1;
        for (int i = 0; i < segs; ++i) {
            const PLVertex& v0 = p.vertices[i];
            const PLVertex& v1 = p.vertices[(i + 1) % n];
            if (std::abs(v0.bulge) < 1e-10) {
                auto [ax,ay] = tx(v0.x, v0.y);
                auto [bx,by] = tx(v1.x, v1.y);
                pushLine(ax,ay,bx,by);
            } else {
                double d  = std::sqrt((v1.x-v0.x)*(v1.x-v0.x) +
                                      (v1.y-v0.y)*(v1.y-v0.y));
                double b  = v0.bulge;
                double r  = std::abs(d * (1 + b*b) / (4 * b));
                double mx = (v0.x + v1.x) / 2.0;
                double my = (v0.y + v1.y) / 2.0;
                double dx = (v1.x - v0.x);
                double dy = (v1.y - v0.y);
                double len = std::sqrt(dx*dx + dy*dy);
                double px  = -dy / len;
                double py  =  dx / len;
                double sagitta = r - std::sqrt(std::max(0.0, r*r - (d/2)*(d/2)));
                double sign = b > 0 ? 1.0 : -1.0;
                double cx   = mx + sign * px * (r - sagitta);
                double cy   = my + sign * py * (r - sagitta);
                double sa   = std::atan2(v0.y - cy, v0.x - cx);
                double ea   = std::atan2(v1.y - cy, v1.x - cx);
                double sw;
                if (b > 0) {
                    sw = ea - sa;
                    if (sw <= 0) sw += 2*PI;
                } else {
                    sw = ea - sa;
                    if (sw >= 0) sw -= 2*PI;
                }
                tessArc(cx, cy, r, sa, sw, fr,fg,fb, xfm);
            }
        }
        // dots
        if (m_showDots) {
            for (int i = 0; i < n; ++i) {
                double outBulge = p.vertices[i].bulge;
                double inBulge  = (i == 0)
                    ? (p.closed ? p.vertices[n-1].bulge : 0.0)
                    : p.vertices[i-1].bulge;
                bool isCurve = std::abs(outBulge) > 1e-10 || std::abs(inBulge) > 1e-10;
                auto [px,py] = tx(p.vertices[i].x, p.vertices[i].y);
                if (isCurve)
                    pushDot(px,py, m_curveR,m_curveG,m_curveB, m_curveSize);
                else
                    pushDot(px,py, m_lineR,m_lineG,m_lineB, m_lineSize);
            }
        }
        break;
    }

    case EntityType::ELLIPSE: {
        auto& el = static_cast<const EllipseEntity&>(e);
        double majorLen = std::sqrt(el.majorX*el.majorX + el.majorY*el.majorY);
        double minorLen = majorLen * el.ratio;
        double axisAngle = std::atan2(el.majorY, el.majorX);
        double cosA = std::cos(axisAngle), sinA = std::sin(axisAngle);
        int n = ARC_SEGS;
        double sp = el.startParam, ep = el.endParam;
        double sweep = ep - sp;
        for (int i = 0; i < n; ++i) {
            double t0 = sp + sweep * ( i      / (double)n);
            double t1 = sp + sweep * ((i + 1) / (double)n);
            double ex0 = el.cx + cosA * majorLen * std::cos(t0) - sinA * minorLen * std::sin(t0);
            double ey0 = el.cy + sinA * majorLen * std::cos(t0) + cosA * minorLen * std::sin(t0);
            double ex1 = el.cx + cosA * majorLen * std::cos(t1) - sinA * minorLen * std::sin(t1);
            double ey1 = el.cy + sinA * majorLen * std::cos(t1) + cosA * minorLen * std::sin(t1);
            auto [ax,ay] = tx(ex0, ey0);
            auto [bx,by] = tx(ex1, ey1);
            pushLine(ax,ay,bx,by);
        }
        if (m_showDots) {
            for (double t : {sp, ep}) {
                double ex = el.cx + cosA * majorLen * std::cos(t) - sinA * minorLen * std::sin(t);
                double ey = el.cy + sinA * majorLen * std::cos(t) + cosA * minorLen * std::sin(t);
                auto [px,py] = tx(ex, ey);
                pushDot(px,py, m_curveR,m_curveG,m_curveB, m_curveSize);
            }
        }
        break;
    }

    case EntityType::SPLINE: {
        auto& sp = static_cast<const SplineEntity&>(e);
        int n = (int)sp.points.size();
        if (n < 2) break;
        int segs = sp.closed ? n : n - 1;
        for (int i = 0; i < segs; ++i) {
            auto& p0 = sp.points[i];
            auto& p1 = sp.points[(i + 1) % n];
            auto [ax,ay] = tx(p0.first, p0.second);
            auto [bx,by] = tx(p1.first, p1.second);
            pushLine(ax,ay,bx,by);
        }
        if (m_showDots) {
            for (auto& pt : sp.points) {
                auto [px,py] = tx(pt.first, pt.second);
                pushDot(px,py, m_curveR,m_curveG,m_curveB, m_curveSize);
            }
        }
        break;
    }

    case EntityType::INSERT: {
        if (depth >= 8) break;
        auto& ins = static_cast<const InsertEntity&>(e);
        auto itBlk = doc.blocks.find(ins.blockName);
        if (itBlk == doc.blocks.end()) break;
        const Block& blk = itBlk->second;

        double rotRad = ins.rotation * PI / 180.0;
        float  cosR   = (float)std::cos(rotRad);
        float  sinR   = (float)std::sin(rotRad);

        int cols = std::max(1, ins.colCount);
        int rows = std::max(1, ins.rowCount);

        for (int col = 0; col < cols; ++col) {
            for (int row = 0; row < rows; ++row) {
                // INSERT position in parent's local space
                double lx = ins.x + col * ins.colSpacing;
                double ly = ins.y + row * ins.rowSpacing;

                // Build child-frame transform:
                // 1. subtract block base point
                // 2. scale by ins.xScale/yScale
                // 3. rotate by ins.rotation
                // 4. translate to INSERT position in parent space
                // Then compose with parent xfm

                // Child local transform (in INSERT's local frame):
                //   world = R * S * (local - base) + [lx,ly]
                // which is:
                //   world = R*S*local - R*S*base + [lx,ly]
                float sx  = (float)(ins.xScale);
                float sy  = (float)(ins.yScale);

                // rs* = rotation * scale matrix
                float rsa = cosR * sx,  rsb = -sinR * sy;
                float rsc = sinR * sx,  rsd =  cosR * sy;

                // offset = [lx,ly] - R*S*base
                float bpx = rsa * (float)blk.baseX + rsb * (float)blk.baseY;
                float bpy = rsc * (float)blk.baseX + rsd * (float)blk.baseY;
                float offLX = (float)lx - bpx;
                float offLY = (float)ly - bpy;

                // Child transform in parent's local frame
                Transform2D childLocal = { rsa, rsb, rsc, rsd, offLX, offLY };

                // Compose with outer transform
                Transform2D childXfm = compose(xfm, childLocal);

                for (auto& be : blk.entities) {
                    tessellateEntity(*be, doc, lname, fr, fg, fb, childXfm, depth + 1);
                }
            }
        }
        break;
    }

    case EntityType::TEXT:
    case EntityType::MTEXT:
    case EntityType::POLYLINE:
    default:
        break;
    }
}

// ---------------------------------------------------------------------------
// tessellate — rebuild m_lineVerts and m_dotVerts from m_doc
// ---------------------------------------------------------------------------
void Renderer::tessellate() {
    m_lineVerts.clear();
    m_dotVerts.clear();
    if (!m_doc) return;

    Transform2D identity = {1,0,0,1,0,0};
    for (auto& ent : m_doc->entities) {
        tessellateEntity(*ent, *m_doc, "0", 1,1,1, identity, 0);
    }
}

// ---------------------------------------------------------------------------
// uploadBuffers
// ---------------------------------------------------------------------------
void Renderer::uploadBuffers() {
#ifdef __EMSCRIPTEN__
    glBindBuffer(GL_ARRAY_BUFFER, m_lineVBO);
    glBufferData(GL_ARRAY_BUFFER,
                 (GLsizeiptr)(m_lineVerts.size() * sizeof(LineVertex)),
                 m_lineVerts.data(), GL_DYNAMIC_DRAW);

    glBindBuffer(GL_ARRAY_BUFFER, m_dotVBO);
    glBufferData(GL_ARRAY_BUFFER,
                 (GLsizeiptr)(m_dotVerts.size() * sizeof(DotVertex)),
                 m_dotVerts.data(), GL_DYNAMIC_DRAW);

    glBindBuffer(GL_ARRAY_BUFFER, 0);
#endif
}

// ---------------------------------------------------------------------------
// loadDocument
// ---------------------------------------------------------------------------
void Renderer::loadDocument(const DXFDocument& doc) {
    m_doc = &doc;
    // Initialise layer visibility from document
    for (auto& [name, layer] : doc.layers) {
        if (m_layerVisible.find(name) == m_layerVisible.end())
            m_layerVisible[name] = !layer.isOff;
    }
    tessellate();
    uploadBuffers();
}

// ---------------------------------------------------------------------------
// setLayerVisibility / setLayerColor
// ---------------------------------------------------------------------------
void Renderer::setLayerVisibility(const std::string& name, bool visible) {
    m_layerVisible[name] = visible;
    tessellate();
    uploadBuffers();
}

void Renderer::setLayerColor(const std::string& name, float r, float g, float b) {
    m_layerCustomColor[name] = {r, g, b};
    tessellate();
    uploadBuffers();
}

// ---------------------------------------------------------------------------
// setViewTransform
// ---------------------------------------------------------------------------
void Renderer::setViewTransform(float scale, float tx, float ty,
                                  float width, float height, float docCy) {
    m_scale = scale;
    m_tx    = tx;
    m_ty    = ty;
    m_width = width;
    m_height= height;
    m_docCy = docCy;
}

// ---------------------------------------------------------------------------
// setPointOpts
// ---------------------------------------------------------------------------
void Renderer::setPointOpts(bool show,
                              float lineR, float lineG, float lineB, float lineSize,
                              float curveR, float curveG, float curveB, float curveSize) {
    bool wasShow = m_showDots;
    m_showDots  = show;
    m_lineR  = lineR;  m_lineG  = lineG;  m_lineB  = lineB;  m_lineSize  = lineSize;
    m_curveR = curveR; m_curveG = curveG; m_curveB = curveB; m_curveSize = curveSize;
    // Retessellate only if dot visibility changed or already showing
    if (wasShow || show) {
        tessellate();
        uploadBuffers();
    }
}

// ---------------------------------------------------------------------------
// renderFrame
// ---------------------------------------------------------------------------
void Renderer::renderFrame() {
#ifdef __EMSCRIPTEN__
    glViewport(0, 0, (int)m_width, (int)m_height);
    glClear(GL_COLOR_BUFFER_BIT);

    if (m_lineVerts.empty() && m_dotVerts.empty()) return;

    // --- Draw lines ---
    glUseProgram(m_lineProg);
    glUniform1f(m_uLScale, m_scale);
    glUniform1f(m_uLTx,    m_tx);
    glUniform1f(m_uLTy,    m_ty);
    glUniform1f(m_uLW,     m_width);
    glUniform1f(m_uLH,     m_height);
    glUniform1f(m_uLCy,    m_docCy);

    glBindVertexArray(m_lineVAO);
    glDrawArrays(GL_LINES, 0, (GLsizei)m_lineVerts.size());

    // --- Draw dots ---
    if (m_showDots && !m_dotVerts.empty()) {
        glUseProgram(m_dotProg);
        glUniform1f(m_uDScale, m_scale);
        glUniform1f(m_uDTx,    m_tx);
        glUniform1f(m_uDTy,    m_ty);
        glUniform1f(m_uDW,     m_width);
        glUniform1f(m_uDH,     m_height);
        glUniform1f(m_uDCy,    m_docCy);

        glBindVertexArray(m_dotVAO);
        glDrawArrays(GL_POINTS, 0, (GLsizei)m_dotVerts.size());
    }

    glBindVertexArray(0);
#endif
}
