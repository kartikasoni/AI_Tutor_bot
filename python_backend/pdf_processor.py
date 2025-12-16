from pdfminer.high_level import extract_text
import os
import logging
logging.getLogger("pdfminer").setLevel(logging.ERROR)

class PDFProcessor:
    def __init__(self, data_folder="data"):
        self.data_folder = data_folder
        os.makedirs(data_folder, exist_ok=True)
    
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF using pdfminer"""
        try:
            print(f"Extracting text using pdfminer...")
            text = extract_text(pdf_path)
            
            if not text or len(text) < 100:
                print(f"Warning: Extracted text is very short ({len(text)} chars)")
            
            return text
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
    
    def get_all_pdfs(self):
        """Get list of all PDFs in data folder"""
        if not os.path.exists(self.data_folder):
            return []
        return [f for f in os.listdir(self.data_folder) if f.endswith('.pdf')]
    
    def get_pdf_path(self, filename):
        """Get full path to PDF file"""
        return os.path.join(self.data_folder, filename)