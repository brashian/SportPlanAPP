import React from "react";

/**
 * RichTextViewer
 * ----------------------------------------------------------------------------
 * Renderiza el HTML generado por React-Quill como HTML estático (sin montar
 * el editor). Se usa en la vista del Atleta para evitar cargar la toolbar
 * y la interactividad del editor cuando solo se necesita lectura.
 */
export default function RichTextViewer({ html }: { html: string }) {
  if (!html || html === "<p><br></p>") {
    return <p className="text-sm text-gray-400 italic">Sin notas para esta sesión.</p>;
  }

  return (
    <div
      className="ql-editor !p-0 text-sm text-gray-700 prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
