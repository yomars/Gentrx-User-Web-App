const printPDF = (pdfUrl) => {
    const newWindow = window.open(pdfUrl, "_blank");
    if (newWindow) {
      newWindow.focus();
  
      newWindow.onload = () => {
        newWindow.load();
        newWindow.onafterprint = () => {
          newWindow.close();
        };
      };
    }
  };
  
  export default printPDF;
  