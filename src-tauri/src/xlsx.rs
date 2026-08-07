use std::io::Write;

/// 极简 xlsx 生成器：对齐单位周报模板样式（表头加粗居中、细边框、自动换行、冻结首行）。
/// 结构：zip 内含 [Content_Types].xml, _rels/.rels, xl/workbook.xml,
/// xl/_rels/workbook.xml.rels, xl/styles.xml, xl/worksheets/sheet1.xml

/// 与单位模板一致的列宽（时间/项目/内容/问题/姓名/备注）
const COL_WIDTHS: [f64; 6] = [17.1, 26.6, 100.2, 19.6, 8.7, 14.1];

const STYLES_XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3">
<font><sz val="12"/><name val="等线"/></font>
<font><b/><sz val="12"/><name val="等线"/></font>
<font><sz val="11"/><name val="宋体"/></font>
</fonts>
<fills count="2">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>"#;

pub fn build_xlsx(
    sheet_name: &str,
    headers: &[&str],
    rows: &[Vec<String>],
) -> Result<Vec<u8>, String> {
    let mut buf: Vec<u8> = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
        let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        // 每个 sheet 行 → 单元格
        let mut sheet_xml = String::from(
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\
             <worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\
             <sheetViews><sheetView tabSelected=\"1\" workbookViewId=\"0\">\
             <pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/>\
             </sheetView></sheetViews><cols>",
        );
        for (i, w) in COL_WIDTHS.iter().enumerate() {
            let n = i + 1;
            sheet_xml.push_str(&format!(
                "<col min=\"{n}\" max=\"{n}\" width=\"{w}\" customWidth=\"1\"/>"
            ));
        }
        sheet_xml.push_str("</cols><sheetData>");

        // 表头行（加粗、居中、自动换行）
        sheet_xml.push_str("<row r=\"1\" ht=\"31\" customHeight=\"1\">");
        for (ci, h) in headers.iter().enumerate() {
            let col = col_letter(ci + 1);
            sheet_xml.push_str(&format!(
                "<c r=\"{col}1\" s=\"1\" t=\"inlineStr\"><is><t>{}</t></is></c>",
                xml_escape(h)
            ));
        }
        sheet_xml.push_str("</row>");

        // 数据行：内容列（第 3 列）用宋体 11，其余用等线 12
        for (ri, row) in rows.iter().enumerate() {
            let rn = ri + 2; // 第 1 行表头
            let ht = estimate_row_height(row);
            sheet_xml.push_str(&format!("<row r=\"{rn}\" ht=\"{ht}\" customHeight=\"1\">"));
            for (ci, cell) in row.iter().enumerate() {
                let col = col_letter(ci + 1);
                let s = if ci == 2 { 3 } else { 2 };
                let t_open = if cell.contains('\n') || cell.contains('\r') || cell.contains('\t') {
                    "<t xml:space=\"preserve\">"
                } else {
                    "<t>"
                };
                sheet_xml.push_str(&format!(
                    "<c r=\"{col}{rn}\" s=\"{s}\" t=\"inlineStr\"><is>{t_open}{}</t></is></c>",
                    xml_escape(cell)
                ));
            }
            sheet_xml.push_str("</row>");
        }
        sheet_xml.push_str("</sheetData></worksheet>");

        zip.start_file("[Content_Types].xml", opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(
            r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"#
                .as_bytes(),
        )
        .map_err(|e| e.to_string())?;

        zip.start_file("_rels/.rels", opts).map_err(|e| e.to_string())?;
        zip.write_all(
            r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"#
                .as_bytes(),
        )
        .map_err(|e| e.to_string())?;

        zip.start_file("xl/workbook.xml", opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(
            format!(
                r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="{sheet}" sheetId="1" r:id="rId1"/></sheets>
</workbook>"#,
                sheet = xml_escape(sheet_name)
            )
            .as_bytes(),
        )
        .map_err(|e| e.to_string())?;

        zip.start_file("xl/_rels/workbook.xml.rels", opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(
            r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"#
                .as_bytes(),
        )
        .map_err(|e| e.to_string())?;

        zip.start_file("xl/styles.xml", opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(STYLES_XML.as_bytes())
            .map_err(|e| e.to_string())?;

        zip.start_file("xl/worksheets/sheet1.xml", opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(sheet_xml.as_bytes())
            .map_err(|e| e.to_string())?;

        zip.finish().map_err(|e| e.to_string())?;
    }
    Ok(buf)
}

/// 按内容长度估算行高（默认 45，长内容逐行增高，避免换行后被截断）
fn estimate_row_height(row: &[String]) -> f64 {
    let mut lines = 1usize;
    for (ci, cell) in row.iter().enumerate() {
        let width = COL_WIDTHS.get(ci).copied().unwrap_or(12.0);
        // 中文约 2 个单位/字，列宽折算每行可容纳字符数
        let cpl = ((width / 2.0).floor() as usize).max(4);
        let mut n = 0usize;
        for seg in cell.split('\n') {
            n += ((seg.chars().count() + cpl - 1) / cpl).max(1);
        }
        lines = lines.max(n);
    }
    (lines as f64 * 22.0 + 8.0).max(45.0)
}

fn col_letter(n: usize) -> String {
    let mut n = n;
    let mut s = String::new();
    while n > 0 {
        n -= 1;
        s.insert(0, (b'A' + (n % 26) as u8) as char);
        n /= 26;
    }
    s
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_valid_xlsx() {
        let headers = ["时间", "工作类型/项目名称", "工作内容", "工作/项目存在的问题", "人员姓名", "其他备注"];
        let rows = vec![
            vec![
                "2026-08-03".into(),
                "燃气项目".into(),
                "1. 部署发一版\n2. 测试启动".into(),
                "无".into(),
                "张三".into(),
                String::new(),
            ],
        ];
        let bytes = build_xlsx("Sheet1", &headers, &rows).unwrap();
        // zip 魔数 PK\x03\x04
        assert_eq!(&bytes[0..4], b"PK\x03\x04");
        assert!(bytes.len() > 1000);
        // 含样式与冻结窗格
        let hay = String::from_utf8_lossy(&bytes);
        assert!(hay.contains("xl/styles.xml"));
        assert!(hay.contains("xl/worksheets/sheet1.xml"));
        // 落盘供外部验证（python 读回确认 Excel 可打开）
        std::fs::write(std::env::temp_dir().join("ribao_test.xlsx"), &bytes).unwrap();
        println!("xlsx bytes: {}", bytes.len());
    }
}
