import Foundation
import CoreText
import CoreGraphics

func num(_ n: CGFloat) -> String { String(format: "%.3f", Double(n)).replacingOccurrences(of: #"\.?0+$"#, with: "", options: .regularExpression) }
func svgPath(_ path: CGPath) -> String {
    var result = ""
    path.applyWithBlock { pointer in
        let e = pointer.pointee
        func p(_ i: Int) -> String { "\(num(e.points[i].x)) \(num(e.points[i].y))" }
        switch e.type {
        case .moveToPoint: result += "M\(p(0))"
        case .addLineToPoint: result += "L\(p(0))"
        case .addQuadCurveToPoint: result += "Q\(p(0)) \(p(1))"
        case .addCurveToPoint: result += "C\(p(0)) \(p(1)) \(p(2))"
        case .closeSubpath: result += "Z"
        @unknown default: break
        }
    }
    return result
}
let data = FileHandle.standardInput.readDataToEndOfFile()
let requests = try JSONSerialization.jsonObject(with: data) as! [[String: Any]]
var output = [[String: Any]]()
for request in requests {
    if let commands = request["commands"] as? [[Any]] {
        let p = CGMutablePath()
        for c in commands {
            let op = c[0] as! String
            func n(_ i: Int) -> CGFloat { CGFloat((c[i] as! NSNumber).doubleValue) }
            switch op {
            case "M": p.move(to: CGPoint(x:n(1),y:n(2)))
            case "L": p.addLine(to: CGPoint(x:n(1),y:n(2)))
            case "C": p.addCurve(to: CGPoint(x:n(5),y:n(6)), control1: CGPoint(x:n(1),y:n(2)), control2: CGPoint(x:n(3),y:n(4)))
            case "Z": p.closeSubpath()
            default: break
            }
        }
        let expanded = p.copy(strokingWithWidth: CGFloat((request["stroke"] as! NSNumber).doubleValue), lineCap: .round, lineJoin: .round, miterLimit: 2)
        output.append(["key": request["key"]!, "d": svgPath(expanded)])
        continue
    }
    let size = CGFloat((request["size"] as! NSNumber).doubleValue)
    let bold = (request["weight"] as? String ?? "regular") == "bold"
    let font = CTFontCreateWithName((bold ? "AppleSDGothicNeo-Bold" : "AppleSDGothicNeo-Regular") as CFString, size, nil)
    let text = request["text"] as! String
    let a = NSAttributedString(string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font])
    let line = CTLineCreateWithAttributedString(a)
    let runs = CTLineGetGlyphRuns(line) as! [CTRun]
    let full = CGMutablePath()
    var missing = 0
    for run in runs {
        let count = CTRunGetGlyphCount(run)
        var glyphs = [CGGlyph](repeating: 0, count: count)
        var positions = [CGPoint](repeating: .zero, count: count)
        CTRunGetGlyphs(run, CFRange(location:0,length:0), &glyphs)
        CTRunGetPositions(run, CFRange(location:0,length:0), &positions)
        let attrs = CTRunGetAttributes(run) as NSDictionary
        let runFont = attrs[kCTFontAttributeName] as! CTFont
        for i in 0..<count {
            if glyphs[i] == 0 { missing += 1 }
            if let p = CTFontCreatePathForGlyph(runFont, glyphs[i], nil) {
                let t = CGAffineTransform(a:1,b:0,c:0,d:-1,tx:positions[i].x,ty:-positions[i].y)
                full.addPath(p, transform:t)
            }
        }
    }
    output.append(["key":request["key"]!, "d": svgPath(full), "width": CTLineGetTypographicBounds(line,nil,nil,nil), "missingGlyphs":missing])
}
let encoded = try JSONSerialization.data(withJSONObject:output, options:[.sortedKeys])
FileHandle.standardOutput.write(encoded)
