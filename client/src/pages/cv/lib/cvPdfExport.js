import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { ensurePdfUnicodeFont } from "../../../shared/lib/pdfFont";
import { attributeLabel } from "../../../shared/i18n/labels";
import { getCandidateName } from "./cvUtils";

export async function downloadCvPdf({ cv, drafts, id, t }) {
  const name = getCandidateName(cv, drafts);

  const doc = new jsPDF();
  await ensurePdfUnicodeFont(doc);
  const margin = 14;
  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(cv.position.title || "CV", margin, y);
  y += 10;
  doc.setFontSize(12);
  doc.text(name, margin, y);
  y += 8;
  if (cv.position.company) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(cv.position.company, margin, y);
    doc.setTextColor(0);
    y += 10;
  } else {
    y += 4;
  }

  doc.setFontSize(11);
  doc.text(t("cv.details"), margin, y);
  y += 7;
  doc.setFontSize(9);
  for (const item of cv.attributes) {
    const label = attributeLabel(t, item.attribute);
    const raw = drafts[item.attribute.id] ?? item.value;
    let text = "—";
    if (raw == null || raw === "") text = "—";
    else if (typeof raw === "boolean") text = raw ? t("common.yes") : t("common.no");
    else if (typeof raw === "object") text = JSON.stringify(raw);
    else text = String(raw);
    const line = `${label}: ${text}`.slice(0, 110);
    if (y > 250) {
      doc.addPage();
      doc.setFont("DejaVuSans", "normal");
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6;
  }

  const cvUrl = `${window.location.origin}/cvs/${id}`;
  const qrDataUrl = await QRCode.toDataURL(cvUrl, { margin: 1, width: 140 });
  if (y > 200) {
    doc.addPage();
    doc.setFont("DejaVuSans", "normal");
    y = 20;
  }
  y += 6;
  doc.setFontSize(10);
  doc.text(t("cv.qrHint"), margin, y);
  y += 4;
  doc.addImage(qrDataUrl, "PNG", margin, y, 40, 40);
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(cvUrl, margin + 45, y + 20, { maxWidth: pageWidth - margin * 2 - 45 });

  doc.save(`cv-${id}.pdf`);
}
