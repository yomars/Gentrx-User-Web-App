const printPDF = (pdfUrl) => {
  const newWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");
  if (!newWindow) return;

  newWindow.focus();

  // Try automatic print when browser allows it, but never break file opening.
  newWindow.onload = () => {
    try {
      newWindow.print();
      newWindow.onafterprint = () => {
        newWindow.close();
      };
    } catch {
      // Some browsers block programmatic printing for cross-origin docs.
    }
  };
};
  
export default printPDF;
  