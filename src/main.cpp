#include <emscripten/bind.h>
#include "dxf_parser.h"
#include "renderer.h"
#include <sstream>
#include <cmath>

static DXFDocument g_doc;
static Renderer    g_renderer;

// ---------------------------------------------------------------------------
// JSON helpers (minimal, no external deps)
// ---------------------------------------------------------------------------
static std::string escapeJSON(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 4);
    for (char c : s) {
        if      (c == '"')  out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else                out += c;
    }
    return out;
}

static std::string d2s(double v) {
    // compact double → string
    std::ostringstream ss;
    ss << v;
    return ss.str();
}

// ---------------------------------------------------------------------------
// parseDXF
// ---------------------------------------------------------------------------
bool parseDXF(const std::string& content) {
    try {
        DXFParser parser;
        g_doc = parser.parse(content);
        return true;
    } catch (...) {
        return false;
    }
}

// ---------------------------------------------------------------------------
// getBoundsJSON  → {"minX":…,"minY":…,"maxX":…,"maxY":…}
// ---------------------------------------------------------------------------
std::string getBoundsJSON() {
    std::ostringstream ss;
    ss << "{\"minX\":" << d2s(g_doc.minX)
       << ",\"minY\":" << d2s(g_doc.minY)
       << ",\"maxX\":" << d2s(g_doc.maxX)
       << ",\"maxY\":" << d2s(g_doc.maxY)
       << "}";
    return ss.str();
}

// ---------------------------------------------------------------------------
// getLayersJSON  → [{name, colorIndex, r, g, b, isOff}, …]
// ---------------------------------------------------------------------------
std::string getLayersJSON() {
    std::ostringstream ss;
    ss << "[";
    bool first = true;
    for (auto& [name, layer] : g_doc.layers) {
        if (!first) ss << ",";
        first = false;
        Color c = aciToRGB(layer.colorIndex);
        ss << "{"
           << "\"name\":\""  << escapeJSON(name) << "\","
           << "\"colorIndex\":" << layer.colorIndex << ","
           << "\"r\":" << (int)c.r << ","
           << "\"g\":" << (int)c.g << ","
           << "\"b\":" << (int)c.b << ","
           << "\"isOff\":"  << (layer.isOff ? "true" : "false")
           << "}";
    }
    ss << "]";
    return ss.str();
}

// ---------------------------------------------------------------------------
// Entity → JSON fragment
// ---------------------------------------------------------------------------
static std::string entityToJSON(const Entity& e) {
    std::ostringstream ss;
    ss << "{"
       << "\"layer\":\"" << escapeJSON(e.layer) << "\","
       << "\"color\":" << e.colorIndex << ",";

    switch (e.type) {
        case EntityType::LINE: {
            auto& l = static_cast<const LineEntity&>(e);
            ss << "\"type\":\"LINE\","
               << "\"x1\":" << d2s(l.x1) << ","
               << "\"y1\":" << d2s(l.y1) << ","
               << "\"x2\":" << d2s(l.x2) << ","
               << "\"y2\":" << d2s(l.y2);
            break;
        }
        case EntityType::ARC: {
            auto& a = static_cast<const ArcEntity&>(e);
            ss << "\"type\":\"ARC\","
               << "\"cx\":" << d2s(a.cx) << ","
               << "\"cy\":" << d2s(a.cy) << ","
               << "\"r\":"  << d2s(a.r)  << ","
               << "\"sa\":" << d2s(a.startAngle) << ","
               << "\"ea\":" << d2s(a.endAngle);
            break;
        }
        case EntityType::CIRCLE: {
            auto& c = static_cast<const CircleEntity&>(e);
            ss << "\"type\":\"CIRCLE\","
               << "\"cx\":" << d2s(c.cx) << ","
               << "\"cy\":" << d2s(c.cy) << ","
               << "\"r\":"  << d2s(c.r);
            break;
        }
        case EntityType::LWPOLYLINE: {
            auto& p = static_cast<const LWPolylineEntity&>(e);
            ss << "\"type\":\"LWPOLYLINE\","
               << "\"closed\":" << (p.closed ? "true" : "false") << ","
               << "\"pts\":[";
            for (size_t i = 0; i < p.vertices.size(); ++i) {
                if (i) ss << ",";
                ss << "[" << d2s(p.vertices[i].x) << ","
                          << d2s(p.vertices[i].y) << ","
                          << d2s(p.vertices[i].bulge) << "]";
            }
            ss << "]";
            break;
        }
        case EntityType::TEXT: {
            auto& t = static_cast<const TextEntity&>(e);
            ss << "\"type\":\""   << (t.isMText ? "MTEXT" : "TEXT") << "\","
               << "\"x\":"        << d2s(t.x) << ","
               << "\"y\":"        << d2s(t.y) << ","
               << "\"h\":"        << d2s(t.height) << ","
               << "\"rot\":"      << d2s(t.rotation) << ","
               << "\"text\":\""   << escapeJSON(t.text) << "\"";
            break;
        }
        case EntityType::ELLIPSE: {
            auto& el = static_cast<const EllipseEntity&>(e);
            ss << "\"type\":\"ELLIPSE\","
               << "\"cx\":"  << d2s(el.cx) << ","
               << "\"cy\":"  << d2s(el.cy) << ","
               << "\"mx\":"  << d2s(el.majorX) << ","
               << "\"my\":"  << d2s(el.majorY) << ","
               << "\"ratio\":"  << d2s(el.ratio) << ","
               << "\"sp\":"  << d2s(el.startParam) << ","
               << "\"ep\":"  << d2s(el.endParam);
            break;
        }
        case EntityType::INSERT: {
            auto& ins = static_cast<const InsertEntity&>(e);
            ss << "\"type\":\"INSERT\","
               << "\"block\":\"" << escapeJSON(ins.blockName) << "\","
               << "\"x\":"       << d2s(ins.x) << ","
               << "\"y\":"       << d2s(ins.y) << ","
               << "\"sx\":"      << d2s(ins.xScale) << ","
               << "\"sy\":"      << d2s(ins.yScale) << ","
               << "\"rot\":"     << d2s(ins.rotation) << ","
               << "\"cols\":"    << ins.colCount << ","
               << "\"rows\":"    << ins.rowCount << ","
               << "\"csp\":"     << d2s(ins.colSpacing) << ","
               << "\"rsp\":"     << d2s(ins.rowSpacing);
            break;
        }
        case EntityType::SPLINE: {
            auto& sp = static_cast<const SplineEntity&>(e);
            ss << "\"type\":\"SPLINE\","
               << "\"closed\":" << (sp.closed ? "true" : "false") << ","
               << "\"pts\":[";
            for (size_t i = 0; i < sp.points.size(); ++i) {
                if (i) ss << ",";
                ss << "[" << d2s(sp.points[i].first) << ","
                          << d2s(sp.points[i].second) << "]";
            }
            ss << "]";
            break;
        }
        default:
            ss << "\"type\":\"UNKNOWN\"";
            break;
    }
    ss << "}";
    return ss.str();
}

// ---------------------------------------------------------------------------
// getEntitiesJSON  → [entity, …]
// ---------------------------------------------------------------------------
std::string getEntitiesJSON() {
    std::ostringstream ss;
    ss << "[";
    bool first = true;
    for (auto& ent : g_doc.entities) {
        if (!first) ss << ",";
        first = false;
        ss << entityToJSON(*ent);
    }
    ss << "]";
    return ss.str();
}

// ---------------------------------------------------------------------------
// getBlocksJSON  → {blockName: [entity,…], …}
// ---------------------------------------------------------------------------
std::string getBlocksJSON() {
    std::ostringstream ss;
    ss << "{";
    bool firstBlk = true;
    for (auto& [name, blk] : g_doc.blocks) {
        if (!firstBlk) ss << ",";
        firstBlk = false;
        ss << "\"" << escapeJSON(name) << "\":{"
           << "\"baseX\":" << d2s(blk.baseX) << ","
           << "\"baseY\":" << d2s(blk.baseY) << ","
           << "\"entities\":[";
        bool firstEnt = true;
        for (auto& ent : blk.entities) {
            if (!firstEnt) ss << ",";
            firstEnt = false;
            ss << entityToJSON(*ent);
        }
        ss << "]}";
    }
    ss << "}";
    return ss.str();
}

// ---------------------------------------------------------------------------
// Renderer bindings
// ---------------------------------------------------------------------------
bool initRenderer(const std::string& canvasSelector) {
    return g_renderer.init(canvasSelector);
}

void loadDocument() {
    g_renderer.loadDocument(g_doc);
}

void setLayerVisibility(const std::string& name, bool visible) {
    g_renderer.setLayerVisibility(name, visible);
}

void setLayerColor(const std::string& name, float r, float g, float b) {
    g_renderer.setLayerColor(name, r, g, b);
}

void setViewTransform(float scale, float tx, float ty,
                      float width, float height, float docCy) {
    g_renderer.setViewTransform(scale, tx, ty, width, height, docCy);
}

void renderFrame() {
    g_renderer.renderFrame();
}

void setPointOpts(bool show,
                  float lineR, float lineG, float lineB, float lineSize,
                  float curveR, float curveG, float curveB, float curveSize) {
    g_renderer.setPointOpts(show,
                             lineR, lineG, lineB, lineSize,
                             curveR, curveG, curveB, curveSize);
}

// ---------------------------------------------------------------------------
// Emscripten bindings
// ---------------------------------------------------------------------------
EMSCRIPTEN_BINDINGS(dxf_module) {
    // DXF parsing (existing)
    emscripten::function("parseDXF",       &parseDXF);
    emscripten::function("getBoundsJSON",  &getBoundsJSON);
    emscripten::function("getLayersJSON",  &getLayersJSON);
    emscripten::function("getEntitiesJSON",&getEntitiesJSON);
    emscripten::function("getBlocksJSON",  &getBlocksJSON);
    // WebGL2 renderer (new)
    emscripten::function("initRenderer",       &initRenderer);
    emscripten::function("loadDocument",       &loadDocument);
    emscripten::function("setLayerVisibility", &setLayerVisibility);
    emscripten::function("setLayerColor",      &setLayerColor);
    emscripten::function("setViewTransform",   &setViewTransform);
    emscripten::function("renderFrame",        &renderFrame);
    emscripten::function("setPointOpts",       &setPointOpts);
}
