import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
import { ChevronDown, ChevronUp } from "react-feather";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { label: "Volunteer", value: "volunteer" },
  { label: "Organizer", value: "organizer" },
  { label: "General", value: "general" },
];

const FAQSection = () => {
  const [faqs, setFaqs] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("volunteer");

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/api/faqs");
        setFaqs(res.data);
      } catch (err) {
        setError("Failed to load FAQs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter(faq => faq.category === activeCategory);

  const handleToggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-green-700">Frequently Asked Questions</h1>
      <div className="flex justify-center mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setActiveCategory(cat.value); setOpenIndex(null); }}
            className={`px-6 py-2 text-sm font-semibold border-b-2 transition-all duration-300 focus:outline-none ${
              activeCategory === cat.value
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-green-600"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {loading && <div className="text-center text-gray-500">Loading...</div>}
      {error && <div className="text-center text-red-500">{error}</div>}
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {filteredFaqs.map((faq, idx) => (
            <motion.div
              key={faq._id}
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden"
            >
              <button
                className="w-full flex justify-between items-center px-6 py-4 focus:outline-none text-left group"
                onClick={() => handleToggle(idx)}
                aria-expanded={openIndex === idx}
              >
                <span className="text-lg font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                  {faq.question}
                </span>
                <span className="ml-4 text-green-600">
                  {openIndex === idx ? <ChevronUp /> : <ChevronDown />}
                </span>
              </button>
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 pb-4 text-gray-700 text-base"
                  >
                    <div className="pt-2 animate-fade-in">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
        {!loading && !error && filteredFaqs.length === 0 && (
          <div className="text-center text-gray-400 py-8">No FAQs found for this category.</div>
        )}
      </div>
    </div>
  );
};

export default FAQSection;
