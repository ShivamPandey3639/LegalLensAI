import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Upload,
  AlertTriangle,
  PieChart,
  MessageSquare,
  Menu,
  X,
  Zap,
  ArrowLeft,
  Shield,
  Eye,
  Lock,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import { motion, AnimatePresence } from "framer-motion";
import { getChatResponse } from "./api/analyse";
import { getChatResponse2 } from "./api/assistant";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function App() {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [textInput, setTextInput] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showQAPopup, setShowQAPopup] = useState(false);
  const [qaResponse, setQAResponse] = useState("");
  const [qaInput, setQAInput] = useState("");
  const [qaHistory, setQAHistory] = useState([]);
  const [privacyScore, setPrivacyScore] = useState(78);
  const [dataUsage, setDataUsage] = useState("Medium");
  const [securityLevel, setSecurityLevel] = useState("High");

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (!["application/pdf", "text/plain"].includes(uploadedFile.type)) {
      alert("Please upload a PDF or text file");
      return;
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      alert("File size too large (max 5MB)");
      return;
    }

    try {
      setFile(uploadedFile);

      if (uploadedFile.type === "application/pdf") {
        const content = await readPdfContent(uploadedFile);
        if (!content.trim()) throw new Error("No readable text found in PDF");
        setFileContent(content);
      } else {
        const content = await uploadedFile.text();
        setFileContent(content);
      }

      // Show confirmation
      alert("File uploaded successfully!");
    } catch (error) {
      console.error("Error reading file:", error);
      setFile(null);
      setFileContent("");
      alert(`Error reading file: ${error.message}`);
    }
  };

  const readPdfContent = async (pdfFile) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let content = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        content +=
          textContent.items
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ") + "\n";
      }
      return content;
    } catch (error) {
      console.error("Detailed PDF extraction error:", error);
      throw new Error(
        "Failed to extract text from PDF - it may be scanned or image-based"
      );
    }
  };

  const handleTextInputChange = (e) => {
    console.log("input is -- " + e.target.value);
    setTextInput(e.target.value);
  };
  const handleSubmit = async () => {
    const contentToAnalyze = fileContent || textInput;
    if (!contentToAnalyze) return;

    setLoading(true);
    const response = await getChatResponse(contentToAnalyze);
    // Log the response to inspect its structure
    console.log("LLM response:", response);

    // For debugging, convert response to a string.
    // Later, extract the exact field (e.g., response.summary or response.generated_text) if available.
    const formattedSummary = response
      .split("\n")
      .map((line) => {
        // Add extra spacing for headings and important sections
        if (line.startsWith("#")) {
          return `\n${line}\n`;
        }
        // Emphasize bullet points
        if (line.startsWith("- ")) {
          return `  ${line}`;
        }
        return line;
      })
      .join("\n");

    setSummary(formattedSummary);
    const parseMetrics = () => {
      // Split the response into lines
      const lines = response.split("\n");

      // Find and extract metrics
      let privacyScore = 30;
      let dataUsage = "High";
      let securityLevel = "Low";

      lines.forEach((line) => {
        const privacyScoreMatch = line.match(/Privacy Score:\s*(\d+)\/100/i);
        if (privacyScoreMatch) {
          privacyScore = parseInt(privacyScoreMatch[1], 10);
        }

        const dataUsageMatch = line.match(
          /Data Usage Risk:\s*(Low|Medium|High)/i
        );
        if (dataUsageMatch) {
          dataUsage = dataUsageMatch[1];
        }

        const securityLevelMatch = line.match(
          /Overall Security Level:\s*(Low|Medium|High)/i
        );
        if (securityLevelMatch) {
          securityLevel = securityLevelMatch[1];
        }
      });

      return { privacyScore, dataUsage, securityLevel };
    };

    // Extract and set metrics
    const { privacyScore, dataUsage, securityLevel } = parseMetrics();

    console.log("Extracted Metrics:", {
      privacyScore,
      dataUsage,
      securityLevel,
    });

    setPrivacyScore(privacyScore);
    setDataUsage(dataUsage);
    setSecurityLevel(securityLevel);
    setLoading(false);
  };

  const handleQASubmit = async () => {
    if (qaInput) {
      // Add current Q&A to history
      const newQAEntry = {
        input: qaInput,
        response: null,
        timestamp: new Date(),
      };
      setQAHistory((prev) => [...prev, newQAEntry]);

      setLoading(true);
      try {
        // Simulate API call or use actual API
        const response = await getChatResponse2(qaInput);

        // Update the last entry in QA history with the response
        setQAHistory((prev) =>
          prev.map((entry, index) =>
            index === prev.length - 1 ? { ...entry, response: response } : entry
          )
        );

        setQAResponse(response);
        setShowQAPopup(true);
      } catch (error) {
        console.error("Error in Q&A submission:", error);
        // Update the last entry with an error message
        setQAHistory((prev) =>
          prev.map((entry, index) =>
            index === prev.length - 1
              ? { ...entry, response: "Error processing your question." }
              : entry
          )
        );
      } finally {
        setLoading(false);
        setQAInput(""); // Clear input after submission
      }
    }
  };
  const mainContentRef = useRef(null);

  // Function to scroll to main content
  const scrollToMainContent = () => {
    mainContentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjMjEyMTIxMjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgNUw1IDBaTTYgNEw0IDZaTS0xIDFMMSAtMVoiIHN0cm9rZT0iIzRmNGY0ZjIwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-indigo-500/10 to-purple-500/10 animate-gradient-slow"></div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 -z-5">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-500 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              transition: {
                duration: 10 + Math.random() * 20,
                repeat: Number.POSITIVE_INFINITY,
              },
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrollY > 50 ? "backdrop-blur-xl bg-slate-900/70" : ""
        }`}
      >
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                LegalLens AI
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setShowVideo(true)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                How It Works
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-slate-300 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 space-y-4">
              <button
                onClick={() => {
                  setShowVideo(true);
                  setIsMenuOpen(false);
                }}
                className="block text-slate-300 hover:text-white transition-colors"
              >
                How It Works
              </button>
              <a
                href="#"
                className="block text-slate-300 hover:text-white transition-colors"
              >
                FAQ
              </a>
            </div>
          )}
        </nav>
      </motion.header>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden py-20 sm:py-32"
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 50 }}
            className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x"
          >
            Uncover Hidden Risks in Your Privacy Terms
          </motion.h2>
          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto"
          >
            Our AI-powered tool analyzes privacy policies and terms of service
            to reveal potential dangers and protect your rights.
          </motion.p>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4"
          >
            <button
              onClick={scrollToMainContent}
              className="group bg-gradient-to-r from-teal-500 to-indigo-500 text-white px-8 py-3 rounded-full hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 relative overflow-hidden"
            >
              <span className="relative z-10">Analyze Now</span>
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
            <button
              onClick={() => setShowVideo(true)}
              className="group bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-full hover:bg-white/20 transition-all duration-300"
            >
              Learn More
              <ArrowRight className="inline-block ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
        {/* Animated particles */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImdyYWQiIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwLjMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4=')] opacity-20 animate-pulse"></div>
        </div>
      </motion.section>

      {/* Main Content */}
      <main ref={mainContentRef} className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
            className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-white/10"
          >
            <div className="border-2 border-dashed border-slate-400/50 rounded-xl p-8 text-center group hover:border-teal-400/50 transition-colors duration-300">
              <Upload className="mx-auto h-16 w-16 text-slate-400 mb-4 group-hover:text-teal-400 transition-colors duration-300" />
              <h3 className="text-xl font-semibold mb-2 text-slate-200">
                Upload Document
              </h3>
              <p className="text-slate-400 mb-6">
                Drag and drop your file here, or click to select
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.txt"
              />
              <label
                htmlFor="file-upload"
                className="group bg-gradient-to-r from-teal-500 to-indigo-500 text-white px-6 py-3 rounded-full hover:shadow-lg hover:shadow-teal-500/25 cursor-pointer inline-block transition-all duration-300 relative overflow-hidden"
              >
                <span className="relative z-10">Select File</span>
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </label>
              <p className="text-sm text-slate-500 mt-4">
                Supported formats: TXT
              </p>
              {file && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-green-400">
                    File loaded: {file.name} ({file.type})
                  </p>
                  {fileContent && (
                    <p className="text-xs text-green-400/70 mt-1">
                      {fileContent.length.toLocaleString()} characters extracted
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Text Input Alternative */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-slate-200">
                Or paste your text
              </h3>
              <textarea
                className="w-full h-40 p-4 bg-white/5 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500"
                placeholder="Paste your privacy policy or terms here..."
                value={textInput}
                onChange={handleTextInputChange}
              />
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 text-white px-6 py-3 rounded-full hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300"
              >
                Analyze Content
              </button>
            </div>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 50, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Summary Card */}
            <div className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-white/10">
              <h3 className="text-xl font-semibold mb-6 flex items-center text-slate-200">
                <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
                Key Findings
              </h3>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-slate-700 rounded-full w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded-full w-1/2"></div>
                  <div className="h-4 bg-slate-700 rounded-full w-5/6"></div>
                </div>
              ) : summary ? (
                <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                  {summary.split("\n").map((line, index) => {
                    if (line.startsWith("# "))
                      return (
                        <h1
                          key={index}
                          className="text-2xl font-bold text-slate-200"
                        >
                          {line.replace("# ", "")}
                        </h1>
                      );
                    if (line.startsWith("## "))
                      return (
                        <h2
                          key={index}
                          className="text-xl font-semibold text-slate-300 mt-4"
                        >
                          {line.replace("## ", "")}
                        </h2>
                      );
                    if (line.startsWith("- "))
                      return (
                        <p
                          key={index}
                          className="text-slate-400 pl-4 before:content-['•'] before:mr-2"
                        >
                          {line.replace("- ", "")}
                        </p>
                      );
                    return (
                      <p key={index} className="text-slate-300">
                        {line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No content analyzed yet.</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Upload a document or paste text to get started.
                  </p>
                </div>
              )}
            </div>

            {/* Analytics Dashboard */}
            <div className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-white/10">
              <h3 className="text-xl font-semibold mb-6 flex items-center text-slate-200">
                <PieChart className="h-6 w-6 text-teal-400 mr-3" />
                Document Analytics
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-teal-500/10 to-transparent rounded-xl border border-teal-500/20">
                  <Shield className="h-8 w-8 text-teal-400 mb-2" />
                  <p className="text-sm text-slate-400 mb-2">Privacy Score</p>
                  <p className="text-3xl font-bold text-slate-200">
                    {privacyScore}%
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-xl border border-indigo-500/20">
                  <Eye className="h-8 w-8 text-indigo-400 mb-2" />
                  <p className="text-sm text-slate-400 mb-2">Data Usage</p>
                  <p className="text-3xl font-bold text-slate-200">
                    {dataUsage}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl border border-purple-500/20">
                  <Lock className="h-8 w-8 text-purple-400 mb-2" />
                  <p className="text-sm text-slate-400 mb-2">Security Level</p>
                  <p className="text-3xl font-bold text-slate-200">
                    {securityLevel}
                  </p>
                </div>
              </div>
            </div>

            {/* Q&A Section */}
            <div className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-white/10">
              <h3 className="text-xl font-semibold mb-6 flex items-center text-slate-200">
                <MessageSquare className="h-6 w-6 text-indigo-400 mr-3" />
                Q&A History
              </h3>
              <div className="space-y-4">
                {/* Q&A Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ask about specific clauses or terms..."
                    className="w-full p-4 pr-12 bg-white/5 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500"
                    value={qaInput}
                    onChange={(e) => setQAInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleQASubmit()}
                  />
                  <button
                    onClick={handleQASubmit}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Q&A History Display */}
                <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                  {qaHistory.map((entry, index) => (
                    <div key={index} className="bg-white/10 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-slate-300">
                          Question
                        </p>
                        <span className="text-xs text-slate-500">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-400 mb-2">{entry.input}</p>
                      {entry.response && (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold text-slate-300">
                              Answer
                            </p>
                          </div>
                          <p className="text-slate-400">{entry.response}</p>
                        </>
                      )}
                      {loading && index === qaHistory.length - 1 && (
                        <div className="animate-pulse h-4 bg-slate-700 rounded-full w-3/4"></div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-slate-500 pl-4 border-l-2 border-slate-700">
                  Try asking: "What does this policy say about data sharing?"
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-xl font-semibold mb-4 bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                About
              </h4>
              <p className="text-slate-400">
                Empowering users to understand and protect their rights in the
                digital age through AI-powered legal document analysis.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4 bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                Resources
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="github.com/shivampandey3639"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Github
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4 bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                Legal
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 p-4 rounded-lg max-w-3xl w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  How It Works
                </h3>
                <button
                  onClick={() => setShowVideo(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Q&A Popup */}
      <AnimatePresence>
        {showQAPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 p-6 rounded-lg max-w-2xl w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Answer</h3>
                <button
                  onClick={() => setShowQAPopup(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-slate-300 mb-6">{qaResponse}</p>
              <button
                onClick={() => setShowQAPopup(false)}
                className="bg-gradient-to-r from-teal-500 to-indigo-500 text-white px-4 py-2 rounded-full hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
