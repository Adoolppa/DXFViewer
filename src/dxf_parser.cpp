#include "dxf_parser.h"
#include <sstream>
#include <algorithm>
#include <cmath>
#include <stdexcept>

// ---------------------------------------------------------------------------
// ACI colour table (indices 1-255)
// ---------------------------------------------------------------------------
static const Color ACI_COLORS[256] = {
    {  0,  0,  0},  // 0  BYBLOCK / black
    {255,  0,  0},  // 1  red
    {255,255,  0},  // 2  yellow
    {  0,255,  0},  // 3  green
    {  0,255,255},  // 4  cyan
    {  0,  0,255},  // 5  blue
    {255,  0,255},  // 6  magenta
    {255,255,255},  // 7  white
    { 65, 65, 65},  // 8  dark grey
    {128,128,128},  // 9  grey
    {255,  0,  0},  // 10
    {255,170,170},  // 11
    {189,  0,  0},  // 12
    {189,126,126},  // 13
    {129,  0,  0},  // 14
    {129, 86, 86},  // 15
    {104,  0,  0},  // 16
    {104, 69, 69},  // 17
    { 79,  0,  0},  // 18
    { 79, 53, 53},  // 19
    {255, 63,  0},  // 20
    {255,191,170},  // 21
    {189, 46,  0},  // 22
    {189,141,126},  // 23
    {129, 31,  0},  // 24
    {129, 96, 86},  // 25
    {104, 25,  0},  // 26
    {104, 78, 69},  // 27
    { 79, 19,  0},  // 28
    { 79, 59, 53},  // 29
    {255,127,  0},  // 30
    {255,212,170},  // 31
    {189, 94,  0},  // 32
    {189,157,126},  // 33
    {129, 64,  0},  // 34
    {129,107, 86},  // 35
    {104, 52,  0},  // 36
    {104, 86, 69},  // 37
    { 79, 39,  0},  // 38
    { 79, 66, 53},  // 39
    {255,191,  0},  // 40
    {255,234,170},  // 41
    {189,141,  0},  // 42
    {189,173,126},  // 43
    {129, 96,  0},  // 44
    {129,118, 86},  // 45
    {104, 78,  0},  // 46
    {104, 95, 69},  // 47
    { 79, 59,  0},  // 48
    { 79, 73, 53},  // 49
    {255,255,  0},  // 50
    {255,255,170},  // 51
    {189,189,  0},  // 52
    {189,189,126},  // 53
    {129,129,  0},  // 54
    {129,129, 86},  // 55
    {104,104,  0},  // 56
    {104,104, 69},  // 57
    { 79, 79,  0},  // 58
    { 79, 79, 53},  // 59
    {191,255,  0},  // 60
    {234,255,170},  // 61
    {141,189,  0},  // 62
    {173,189,126},  // 63
    { 96,129,  0},  // 64
    {118,129, 86},  // 65
    { 78,104,  0},  // 66
    { 95,104, 69},  // 67
    { 59, 79,  0},  // 68
    { 73, 79, 53},  // 69
    {127,255,  0},  // 70
    {212,255,170},  // 71
    { 94,189,  0},  // 72
    {157,189,126},  // 73
    { 64,129,  0},  // 74
    {107,129, 86},  // 75
    { 52,104,  0},  // 76
    { 86,104, 69},  // 77
    { 39, 79,  0},  // 78
    { 66, 79, 53},  // 79
    { 63,255,  0},  // 80
    {191,255,170},  // 81
    { 46,189,  0},  // 82
    {141,189,126},  // 83
    { 31,129,  0},  // 84
    { 96,129, 86},  // 85
    { 25,104,  0},  // 86
    { 78,104, 69},  // 87
    { 19, 79,  0},  // 88
    { 59, 79, 53},  // 89
    {  0,255,  0},  // 90
    {170,255,170},  // 91
    {  0,189,  0},  // 92
    {126,189,126},  // 93
    {  0,129,  0},  // 94
    { 86,129, 86},  // 95
    {  0,104,  0},  // 96
    { 69,104, 69},  // 97
    {  0, 79,  0},  // 98
    { 53, 79, 53},  // 99
    {  0,255, 63},  // 100
    {170,255,191},  // 101
    {  0,189, 46},  // 102
    {126,189,141},  // 103
    {  0,129, 31},  // 104
    { 86,129, 96},  // 105
    {  0,104, 25},  // 106
    { 69,104, 78},  // 107
    {  0, 79, 19},  // 108
    { 53, 79, 59},  // 109
    {  0,255,127},  // 110
    {170,255,212},  // 111
    {  0,189, 94},  // 112
    {126,189,157},  // 113
    {  0,129, 64},  // 114
    { 86,129,107},  // 115
    {  0,104, 52},  // 116
    { 69,104, 86},  // 117
    {  0, 79, 39},  // 118
    { 53, 79, 66},  // 119
    {  0,255,191},  // 120
    {170,255,234},  // 121
    {  0,189,141},  // 122
    {126,189,173},  // 123
    {  0,129, 96},  // 124
    { 86,129,118},  // 125
    {  0,104, 78},  // 126
    { 69,104, 95},  // 127
    {  0, 79, 59},  // 128
    { 53, 79, 73},  // 129
    {  0,255,255},  // 130
    {170,255,255},  // 131
    {  0,189,189},  // 132
    {126,189,189},  // 133
    {  0,129,129},  // 134
    { 86,129,129},  // 135
    {  0,104,104},  // 136
    { 69,104,104},  // 137
    {  0, 79, 79},  // 138
    { 53, 79, 79},  // 139
    {  0,191,255},  // 140
    {170,234,255},  // 141
    {  0,141,189},  // 142
    {126,173,189},  // 143
    {  0, 96,129},  // 144
    { 86,118,129},  // 145
    {  0, 78,104},  // 146
    { 69, 95,104},  // 147
    {  0, 59, 79},  // 148
    { 53, 73, 79},  // 149
    {  0,127,255},  // 150
    {170,212,255},  // 151
    {  0, 94,189},  // 152
    {126,157,189},  // 153
    {  0, 64,129},  // 154
    { 86,107,129},  // 155
    {  0, 52,104},  // 156
    { 69, 86,104},  // 157
    {  0, 39, 79},  // 158
    { 53, 66, 79},  // 159
    {  0, 63,255},  // 160
    {170,191,255},  // 161
    {  0, 46,189},  // 162
    {126,141,189},  // 163
    {  0, 31,129},  // 164
    { 86, 96,129},  // 165
    {  0, 25,104},  // 166
    { 69, 78,104},  // 167
    {  0, 19, 79},  // 168
    { 53, 59, 79},  // 169
    {  0,  0,255},  // 170
    {170,170,255},  // 171
    {  0,  0,189},  // 172
    {126,126,189},  // 173
    {  0,  0,129},  // 174
    { 86, 86,129},  // 175
    {  0,  0,104},  // 176
    { 69, 69,104},  // 177
    {  0,  0, 79},  // 178
    { 53, 53, 79},  // 179
    { 63,  0,255},  // 180
    {191,170,255},  // 181
    { 46,  0,189},  // 182
    {141,126,189},  // 183
    { 31,  0,129},  // 184
    { 96, 86,129},  // 185
    { 25,  0,104},  // 186
    { 78, 69,104},  // 187
    { 19,  0, 79},  // 188
    { 59, 53, 79},  // 189
    {127,  0,255},  // 190
    {212,170,255},  // 191
    { 94,  0,189},  // 192
    {157,126,189},  // 193
    { 64,  0,129},  // 194
    {107, 86,129},  // 195
    { 52,  0,104},  // 196
    { 86, 69,104},  // 197
    { 39,  0, 79},  // 198
    { 66, 53, 79},  // 199
    {191,  0,255},  // 200
    {234,170,255},  // 201
    {141,  0,189},  // 202
    {173,126,189},  // 203
    { 96,  0,129},  // 204
    {118, 86,129},  // 205
    { 78,  0,104},  // 206
    { 95, 69,104},  // 207
    { 59,  0, 79},  // 208
    { 73, 53, 79},  // 209
    {255,  0,255},  // 210
    {255,170,255},  // 211
    {189,  0,189},  // 212
    {189,126,189},  // 213
    {129,  0,129},  // 214
    {129, 86,129},  // 215
    {104,  0,104},  // 216
    {104, 69,104},  // 217
    { 79,  0, 79},  // 218
    { 79, 53, 79},  // 219
    {255,  0,127},  // 220
    {255,170,212},  // 221
    {189,  0, 94},  // 222
    {189,126,157},  // 223
    {129,  0, 64},  // 224
    {129, 86,107},  // 225
    {104,  0, 52},  // 226
    {104, 69, 86},  // 227
    { 79,  0, 39},  // 228
    { 79, 53, 66},  // 229
    {255,  0, 63},  // 230
    {255,170,191},  // 231
    {189,  0, 46},  // 232
    {189,126,141},  // 233
    {129,  0, 31},  // 234
    {129, 86, 96},  // 235
    {104,  0, 25},  // 236
    {104, 69, 78},  // 237
    { 79,  0, 19},  // 238
    { 79, 53, 59},  // 239
    { 84, 84, 84},  // 240
    {118,118,118},  // 241
    {152,152,152},  // 242
    {186,186,186},  // 243
    {220,220,220},  // 244
    {255,255,255},  // 245
    {255,255,255},  // 246
    {255,255,255},  // 247
    {255,255,255},  // 248
    {255,255,255},  // 249
    {255,255,255},  // 250
    {255,255,255},  // 251
    {255,255,255},  // 252
    {255,255,255},  // 253
    {255,255,255},  // 254
    {255,255,255},  // 255
};

Color aciToRGB(int aci) {
    if (aci < 0 || aci > 255) return {255,255,255};
    return ACI_COLORS[aci];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
static std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    if (a == std::string::npos) return {};
    size_t b = s.find_last_not_of(" \t\r\n");
    return s.substr(a, b - a + 1);
}

static double toDouble(const std::string& s) {
    try { return std::stod(s); } catch(...) { return 0.0; }
}
static int toInt(const std::string& s) {
    try { return std::stoi(s); } catch(...) { return 0; }
}

// ---------------------------------------------------------------------------
// Tokeniser helpers
// ---------------------------------------------------------------------------
bool DXFParser::atEnd() const { return m_pos >= m_lines.size(); }

int DXFParser::peekCode() const {
    if (m_pos >= m_lines.size()) return -1;
    return toInt(trim(m_lines[m_pos]));
}

std::string DXFParser::peekValue() const {
    if (m_pos + 1 >= m_lines.size()) return {};
    return trim(m_lines[m_pos + 1]);
}

void DXFParser::advance() { m_pos += 2; }

bool DXFParser::readPair(int& code, std::string& value) {
    if (m_pos + 1 >= m_lines.size()) return false;
    code  = toInt(trim(m_lines[m_pos]));
    value = trim(m_lines[m_pos + 1]);
    m_pos += 2;
    return true;
}

// ---------------------------------------------------------------------------
// Bounding-box helpers
// ---------------------------------------------------------------------------
void DXFParser::expandBounds(double x, double y) {
    if (!m_doc->boundsValid) {
        m_doc->minX = m_doc->maxX = x;
        m_doc->minY = m_doc->maxY = y;
        m_doc->boundsValid = true;
    } else {
        if (x < m_doc->minX) m_doc->minX = x;
        if (x > m_doc->maxX) m_doc->maxX = x;
        if (y < m_doc->minY) m_doc->minY = y;
        if (y > m_doc->maxY) m_doc->maxY = y;
    }
}

void DXFParser::finaliseBounds() {
    if (!m_doc->boundsValid) {
        m_doc->minX = 0; m_doc->minY = 0;
        m_doc->maxX = 1; m_doc->maxY = 1;
    }
    // add small padding
    double pw = (m_doc->maxX - m_doc->minX) * 0.02;
    double ph = (m_doc->maxY - m_doc->minY) * 0.02;
    if (pw < 1.0) pw = 1.0;
    if (ph < 1.0) ph = 1.0;
    m_doc->minX -= pw; m_doc->maxX += pw;
    m_doc->minY -= ph; m_doc->maxY += ph;
}

// ---------------------------------------------------------------------------
// Main parse
// ---------------------------------------------------------------------------
DXFDocument DXFParser::parse(const std::string& content) {
    DXFDocument doc;
    m_doc = &doc;
    m_pos = 0;
    m_lines.clear();

    // split into lines
    std::istringstream ss(content);
    std::string line;
    while (std::getline(ss, line)) {
        m_lines.push_back(line);
    }

    // scan for sections
    int code; std::string value;
    while (!atEnd()) {
        if (!readPair(code, value)) break;
        if (code == 0 && value == "SECTION") {
            if (!readPair(code, value)) break;  // should be code 2
            if (value == "TABLES") {
                parseTables();
            } else if (value == "BLOCKS") {
                parseBlocks();
            } else if (value == "ENTITIES") {
                parseEntities(doc.entities);
            }
            // skip other sections
        }
    }

    // ensure default layer exists
    if (doc.layers.find("0") == doc.layers.end()) {
        Layer l; l.name = "0"; l.colorIndex = 7;
        doc.layers["0"] = l;
    }

    finaliseBounds();
    return doc;
}

// ---------------------------------------------------------------------------
// TABLE section – we only care about LAYER entries
// ---------------------------------------------------------------------------
void DXFParser::parseTables() {
    int code; std::string value;
    while (!atEnd()) {
        if (!readPair(code, value)) break;
        if (code == 0 && value == "ENDSEC") break;
        if (code == 0 && value == "LAYER") {
            readLayerEntry();
        }
    }
}

void DXFParser::readLayerEntry() {
    Layer layer;
    int code; std::string value;
    while (!atEnd()) {
        int c = peekCode();
        if (c == 0) break;   // next entity/table entry
        readPair(code, value);
        switch (code) {
            case 2:  layer.name = value; break;
            case 62: {
                int ci = toInt(value);
                layer.isOff = (ci < 0);
                layer.colorIndex = std::abs(ci);
            } break;
        }
    }
    if (!layer.name.empty()) {
        m_doc->layers[layer.name] = layer;
    }
}

// ---------------------------------------------------------------------------
// BLOCKS section
// ---------------------------------------------------------------------------
void DXFParser::parseBlocks() {
    int code; std::string value;
    while (!atEnd()) {
        if (!readPair(code, value)) break;
        if (code == 0 && value == "ENDSEC") break;
        if (code == 0 && value == "BLOCK") {
            Block blk;
            // read block header
            while (!atEnd()) {
                int c = peekCode();
                if (c == 0) break;
                readPair(code, value);
                if (code == 2) blk.name = value;
                else if (code == 10) blk.baseX = toDouble(value);
                else if (code == 20) blk.baseY = toDouble(value);
            }
            // read block entities
            parseEntities(blk.entities);
            if (!blk.name.empty() && blk.name[0] != '*') {
                m_doc->blocks[blk.name] = std::move(blk);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// ENTITIES (shared by ENTITIES section and BLOCK bodies)
// ---------------------------------------------------------------------------
void DXFParser::parseEntities(std::vector<std::shared_ptr<Entity>>& out) {
    int code; std::string value;
    while (!atEnd()) {
        int c = peekCode();
        if (c == 0) {
            std::string v = peekValue();
            if (v == "ENDSEC" || v == "ENDBLK") {
                advance(); // consume the 0/ENDSEC pair
                break;
            }
            auto ent = readEntity();
            if (ent) out.push_back(std::move(ent));
        } else {
            readPair(code, value); // skip orphaned pairs
        }
    }
}

// ---------------------------------------------------------------------------
// Entity dispatcher
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readEntity() {
    int code; std::string value;
    if (!readPair(code, value)) return nullptr; // consume "0 / TYPE"

    if (value == "LINE")       return readLine();
    if (value == "ARC")        return readArc();
    if (value == "CIRCLE")     return readCircle();
    if (value == "LWPOLYLINE") return readLWPolyline();
    if (value == "POLYLINE")   return readPolyline();
    if (value == "TEXT")       return readText(false);
    if (value == "MTEXT")      return readText(true);
    if (value == "ELLIPSE")    return readEllipse();
    if (value == "INSERT")     return readInsert();
    if (value == "SPLINE")     return readSpline();

    // unknown entity – skip until next group-0
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
    }
    return nullptr;
}

// ---------------------------------------------------------------------------
// Common base fields: layer (8), color (62)
// ---------------------------------------------------------------------------
static void readBaseFields(Entity& e, int code, const std::string& value) {
    if (code == 8)  e.layer      = value;
    if (code == 62) e.colorIndex = toInt(value);
}

// ---------------------------------------------------------------------------
// LINE
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readLine() {
    auto e = std::make_shared<LineEntity>();
    e->type = EntityType::LINE;
    int code; std::string value;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 10: e->x1 = toDouble(value); break;
            case 20: e->y1 = toDouble(value); break;
            case 11: e->x2 = toDouble(value); break;
            case 21: e->y2 = toDouble(value); break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    expandBounds(e->x1, e->y1);
    expandBounds(e->x2, e->y2);
    return e;
}

// ---------------------------------------------------------------------------
// ARC
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readArc() {
    auto e = std::make_shared<ArcEntity>();
    e->type = EntityType::ARC;
    int code; std::string value;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 10: e->cx = toDouble(value); break;
            case 20: e->cy = toDouble(value); break;
            case 40: e->r  = toDouble(value); break;
            case 50: e->startAngle = toDouble(value); break;
            case 51: e->endAngle   = toDouble(value); break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    expandBounds(e->cx - e->r, e->cy - e->r);
    expandBounds(e->cx + e->r, e->cy + e->r);
    return e;
}

// ---------------------------------------------------------------------------
// CIRCLE
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readCircle() {
    auto e = std::make_shared<CircleEntity>();
    e->type = EntityType::CIRCLE;
    int code; std::string value;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 10: e->cx = toDouble(value); break;
            case 20: e->cy = toDouble(value); break;
            case 40: e->r  = toDouble(value); break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    expandBounds(e->cx - e->r, e->cy - e->r);
    expandBounds(e->cx + e->r, e->cy + e->r);
    return e;
}

// ---------------------------------------------------------------------------
// LWPOLYLINE
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readLWPolyline() {
    auto e = std::make_shared<LWPolylineEntity>();
    e->type = EntityType::LWPOLYLINE;
    int code; std::string value;
    PLVertex cur;
    bool hasCur = false;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 70: e->closed = (toInt(value) & 1) != 0; break;
            case 10: {
                if (hasCur) e->vertices.push_back(cur);
                cur = PLVertex();
                cur.x = toDouble(value);
                hasCur = true;
            } break;
            case 20: cur.y = toDouble(value); break;
            case 42: cur.bulge = toDouble(value); break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    if (hasCur) e->vertices.push_back(cur);
    for (auto& v : e->vertices) expandBounds(v.x, v.y);
    return e;
}

// ---------------------------------------------------------------------------
// POLYLINE (old-style, followed by VERTEX entities)
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readPolyline() {
    auto e = std::make_shared<LWPolylineEntity>();
    e->type = EntityType::LWPOLYLINE;
    int code; std::string value;

    // read POLYLINE header
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        if (code == 70) e->closed = (toInt(value) & 1) != 0;
        else readBaseFields(*e, code, value);
    }

    // read VERTEX entities until SEQEND
    while (!atEnd()) {
        if (peekCode() != 0) { readPair(code, value); continue; }
        std::string v = peekValue();
        if (v == "SEQEND") { advance(); break; }
        if (v == "ENDSEC" || v == "ENDBLK") break;
        readPair(code, value); // consume "0 / VERTEX"
        if (value == "VERTEX") {
            PLVertex vtx;
            while (!atEnd() && peekCode() != 0) {
                readPair(code, value);
                if (code == 10) vtx.x = toDouble(value);
                else if (code == 20) vtx.y = toDouble(value);
                else if (code == 42) vtx.bulge = toDouble(value);
            }
            e->vertices.push_back(vtx);
            expandBounds(vtx.x, vtx.y);
        }
    }
    return e;
}

// ---------------------------------------------------------------------------
// TEXT / MTEXT
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readText(bool isMText) {
    auto e = std::make_shared<TextEntity>();
    e->type   = EntityType::TEXT;
    e->isMText = isMText;
    int code; std::string value;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 10: e->x = toDouble(value); break;
            case 20: e->y = toDouble(value); break;
            case 40: e->height   = toDouble(value); break;
            case 50: e->rotation = toDouble(value); break;
            case  1: e->text = value; break;
            case  3: e->text += value; break;  // MTEXT continuation
            default: readBaseFields(*e, code, value); break;
        }
    }
    expandBounds(e->x, e->y);
    return e;
}

// ---------------------------------------------------------------------------
// ELLIPSE
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readEllipse() {
    auto e = std::make_shared<EllipseEntity>();
    e->type = EntityType::ELLIPSE;
    int code; std::string value;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 10: e->cx = toDouble(value); break;
            case 20: e->cy = toDouble(value); break;
            case 11: e->majorX = toDouble(value); break;
            case 21: e->majorY = toDouble(value); break;
            case 40: e->ratio      = toDouble(value); break;
            case 41: e->startParam = toDouble(value); break;
            case 42: e->endParam   = toDouble(value); break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    double majorLen = std::sqrt(e->majorX*e->majorX + e->majorY*e->majorY);
    expandBounds(e->cx - majorLen, e->cy - majorLen);
    expandBounds(e->cx + majorLen, e->cy + majorLen);
    return e;
}

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readInsert() {
    auto e = std::make_shared<InsertEntity>();
    e->type   = EntityType::INSERT;
    e->xScale = 1; e->yScale = 1;
    int code; std::string value;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case  2: e->blockName   = value; break;
            case 10: e->x           = toDouble(value); break;
            case 20: e->y           = toDouble(value); break;
            case 41: e->xScale      = toDouble(value); break;
            case 42: e->yScale      = toDouble(value); break;
            case 50: e->rotation    = toDouble(value); break;
            case 70: e->colCount    = toInt(value); break;
            case 71: e->rowCount    = toInt(value); break;
            case 44: e->colSpacing  = toDouble(value); break;
            case 45: e->rowSpacing  = toDouble(value); break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    expandBounds(e->x, e->y);
    return e;
}

// ---------------------------------------------------------------------------
// SPLINE – approximate with control points
// ---------------------------------------------------------------------------
std::shared_ptr<Entity> DXFParser::readSpline() {
    auto e = std::make_shared<SplineEntity>();
    e->type = EntityType::SPLINE;
    int code; std::string value;
    double px=0, py=0;
    bool hasPx = false;
    while (!atEnd() && peekCode() != 0) {
        readPair(code, value);
        switch (code) {
            case 70: e->closed = (toInt(value) & 1) != 0; break;
            case 10: px = toDouble(value); hasPx = true; break;
            case 20:
                py = toDouble(value);
                if (hasPx) {
                    e->points.emplace_back(px, py);
                    expandBounds(px, py);
                    hasPx = false;
                }
                break;
            default: readBaseFields(*e, code, value); break;
        }
    }
    return e;
}
