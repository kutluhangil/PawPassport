const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add progress bar to the submit button
const btnSearch = `className="tour-step-generate w-full sm:w-auto bg-[#D4AF37] text-gray-900 dark:text-white px-6 sm:px-12 py-4 rounded-2xl font-display text-xl tracking-widest`;
const btnReplace = `className="relative overflow-hidden tour-step-generate w-full sm:w-auto bg-[#D4AF37] text-gray-900 dark:text-white px-6 sm:px-12 py-4 rounded-2xl font-display text-xl tracking-widest`;
content = content.replace(btnSearch, btnReplace);

const txtSearch = `{isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>`;
const txtReplace = `{isGenerating && <div className="absolute inset-y-0 left-0 bg-white/30 dark:bg-black/20 transition-all duration-300 pointer-events-none" style={{ width: \`\${generateProgress}%\` }}></div>}
                  <div className="relative z-10 flex items-center justify-center gap-3">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating... {generateProgress}%
                    </>`;
content = content.replace(txtSearch, txtReplace);

const txtSearchEnd = `) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      {t.generate}
                    </>
                  )}`;
const txtReplaceEnd = `) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      {t.generate}
                    </>
                  )}
                  </div>`;
content = content.replace(txtSearchEnd, txtReplaceEnd);

// 2. Add loading state to handleOpenSelectKey
const handleSearch = '  const handleOpenSelectKey = async () => {';
const handleReplace = `  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const handleOpenSelectKey = async () => {
    setIsKeyLoading(true);
    try {`;
content = content.replace(handleSearch, handleReplace);

const handleEndSearch = `    await (window as any).aistudio?.openSelectKey();
    setShowKeyDialog(false);
  };`;
const handleEndReplace = `    await (window as any).aistudio?.openSelectKey();
    setShowKeyDialog(false);
    } finally {
      setIsKeyLoading(false);
    }
  };`;
content = content.replace(handleEndSearch, handleEndReplace);

const keyBtnSearch = `onClick={handleOpenSelectKey}
                  className="w-full py-4 px-8 rounded-2xl bg-[#D4AF37] text-gray-900 dark:text-white font-display text-xl tracking-wider hover:bg-[#FBBF24] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                >
                  Select API Key`;
const keyBtnReplace = `onClick={handleOpenSelectKey}
                  disabled={isKeyLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-2xl bg-[#D4AF37] text-gray-900 dark:text-white font-display text-xl tracking-wider hover:bg-[#FBBF24] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50"
                >
                  {isKeyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Select API Key`;
content = content.replace(keyBtnSearch, keyBtnReplace);

content = content.replace(/bg-black\/80 backdrop-blur-md/g, 'bg-black/60 backdrop-blur-lg');

fs.writeFileSync(path, content);
console.log('Features added to App.tsx');
