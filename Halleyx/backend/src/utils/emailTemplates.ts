function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function baseTemplate(title: string, message: string, details: string) {
  return `
  <div style="font-family: Arial; padding: 20px; background: #f4f6f8;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #2c3e50;">${escapeHtml(title)}</h2>

      <p style="font-size: 14px; color: #333;">
        ${escapeHtml(message)}
      </p>

      <div style="background: #f9f9f9; padding: 10px; margin-top: 10px; border-radius: 5px;">
        ${details}
      </div>

      <p style="margin-top: 20px; font-size: 12px; color: #777;">
        — Halleyx Workflow System
      </p>
    </div>
  </div>
  `;
}

export default { baseTemplate };
