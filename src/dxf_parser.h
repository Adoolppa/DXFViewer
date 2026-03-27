#pragma once
#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <cstdint>

// ---------------------------------------------------------------------------
// ACI colour
// ---------------------------------------------------------------------------
struct Color { uint8_t r, g, b; };
Color aciToRGB(int aci);

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------
struct Layer {
    std::string name;
    int   colorIndex = 7;   // default white
    bool  isOff      = false;
};

// ---------------------------------------------------------------------------
// Entity types
// ---------------------------------------------------------------------------
enum class EntityType {
    LINE, ARC, CIRCLE, LWPOLYLINE, POLYLINE, TEXT, MTEXT, ELLIPSE, INSERT, SPLINE
};

// Base entity
struct Entity {
    EntityType  type;
    std::string layer;
    int         colorIndex = -1;   // -1 = BYLAYER,  0 = BYBLOCK
    virtual ~Entity() = default;
};

// LINE
struct LineEntity : Entity {
    double x1=0, y1=0, x2=0, y2=0;
};

// ARC  (angles in degrees)
struct ArcEntity : Entity {
    double cx=0, cy=0, r=1;
    double startAngle=0, endAngle=360;
};

// CIRCLE
struct CircleEntity : Entity {
    double cx=0, cy=0, r=1;
};

// LWPOLYLINE / POLYLINE vertex
struct PLVertex {
    double x=0, y=0;
    double bulge=0;   // bulge factor for arc segments
};

struct LWPolylineEntity : Entity {
    std::vector<PLVertex> vertices;
    bool closed = false;
};

// TEXT / MTEXT
struct TextEntity : Entity {
    double      x=0, y=0;
    double      height=1;
    double      rotation=0;   // degrees
    std::string text;
    bool        isMText = false;
};

// ELLIPSE  (major-axis vector + ratio)
struct EllipseEntity : Entity {
    double cx=0, cy=0;
    double majorX=1, majorY=0;   // major-axis endpoint relative to center
    double ratio=1;              // minor/major ratio
    double startParam=0, endParam=6.283185307;  // radians
};

// INSERT (block reference)
struct InsertEntity : Entity {
    std::string blockName;
    double x=0, y=0;
    double xScale=1, yScale=1;
    double rotation=0;   // degrees
    int    colCount=1, rowCount=1;
    double colSpacing=0, rowSpacing=0;
};

// SPLINE (stored as polyline approximation points)
struct SplineEntity : Entity {
    std::vector<std::pair<double,double>> points;
    bool closed = false;
};

// ---------------------------------------------------------------------------
// Block definition
// ---------------------------------------------------------------------------
struct Block {
    std::string name;
    double baseX=0, baseY=0;
    std::vector<std::shared_ptr<Entity>> entities;
};

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
struct DXFDocument {
    std::unordered_map<std::string, Layer> layers;
    std::unordered_map<std::string, Block> blocks;
    std::vector<std::shared_ptr<Entity>>   entities;
    double minX=0, minY=0, maxX=1, maxY=1;
    bool   boundsValid = false;
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
class DXFParser {
public:
    DXFDocument parse(const std::string& content);

private:
    // tokeniser state
    std::vector<std::string> m_lines;
    size_t                   m_pos = 0;

    DXFDocument* m_doc = nullptr;

    // low-level helpers
    bool        atEnd() const;
    int         peekCode() const;
    std::string peekValue() const;
    void        advance();
    bool        readPair(int& code, std::string& value);

    // section parsers
    void parseTables();
    void parseBlocks();
    void parseEntities(std::vector<std::shared_ptr<Entity>>& out);

    // entity reader – returns nullptr on SEQEND / ENDBLK / EOF
    std::shared_ptr<Entity> readEntity();

    std::shared_ptr<Entity> readLine();
    std::shared_ptr<Entity> readArc();
    std::shared_ptr<Entity> readCircle();
    std::shared_ptr<Entity> readLWPolyline();
    std::shared_ptr<Entity> readPolyline();
    std::shared_ptr<Entity> readText(bool isMText);
    std::shared_ptr<Entity> readEllipse();
    std::shared_ptr<Entity> readInsert();
    std::shared_ptr<Entity> readSpline();

    // layer reader
    void readLayerEntry();

    // bounding-box update
    void expandBounds(double x, double y);
    void finaliseBounds();
};
