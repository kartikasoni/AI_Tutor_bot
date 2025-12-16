import os
import re
from pathlib import Path

from pdf_processor import PDFProcessor
from rag_chain import RAGChain


# =========================
# PATH CONFIGURATION
# =========================
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
INDEX_DIR = BASE_DIR / "indexes"

DATA_DIR.mkdir(exist_ok=True)
INDEX_DIR.mkdir(exist_ok=True)


# =========================
# INDEX NAME NORMALIZATION
# =========================
def normalize_index_name(name: str) -> str:
    """
    Normalize PDF filename or index name into a safe, consistent format.
    This function MUST be used everywhere (UI, indexing, querying).
    """
    name = name.lower()
    name = name.replace(".pdf", "")
    name = re.sub(r"[()]", "", name)      # remove parentheses
    name = re.sub(r"\s+", "_", name)      # spaces → underscores
    name = re.sub(r"_+", "_", name)       # collapse underscores
    return name.strip("_")


# =========================
# INDEX MANAGER
# =========================
class IndexManager:
    def __init__(self):
        self.data_dir = DATA_DIR
        self.index_dir = INDEX_DIR

        self.pdf_processor = PDFProcessor(self.data_dir)
        self.rag_chain = RAGChain()

    def initialize_all_indexes(self):
        """
        Read all PDFs from the data folder and create/load FAISS indexes.
        This MUST run once when the app starts.
        """
        print("\n" + "=" * 60)
        print("🔄 Initializing indexes from data folder...")
        print("=" * 60)

        pdf_files = list(self.data_dir.glob("*.pdf"))

        if not pdf_files:
            print("⚠️  No PDFs found in data folder!")
            return {}, self.rag_chain

        print(f"📚 Found {len(pdf_files)} PDF(s)")

        pdf_info = {}

        for pdf_path in pdf_files:
            pdf_filename = pdf_path.name
            index_name = normalize_index_name(pdf_filename)
            index_path = self.index_dir / index_name

            try:
                print(f"\n📖 Processing: {pdf_filename}")
                print(f"➡️  Index name: {index_name}")

                if index_path.exists():
                    print("✅ Index already exists, loading from disk...")
                    self.rag_chain.load_index(index_name)
                else:
                    print("📄 Extracting text from PDF...")
                    text = self.pdf_processor.extract_text_from_pdf(pdf_path)

                    if not text or len(text.strip()) < 100:
                        print("⚠️  PDF seems empty or unreadable, skipping.")
                        continue

                    print(f"📝 Text length: {len(text)} characters")
                    self.rag_chain.create_index_from_text(text, index_name)

                pdf_info[index_name] = {
                    "filename": pdf_filename,
                    "index_name": index_name,
                    "loaded": True,
                }

                print("✅ Processed successfully!")

            except Exception as e:
                print(f"❌ Error processing {pdf_filename}: {str(e)}")

        print("\n" + "=" * 60)
        print(f"✅ Initialization complete! Loaded {len(pdf_info)} PDF(s)")
        print("=" * 60 + "\n")

        return pdf_info, self.rag_chain