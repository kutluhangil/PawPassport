const fs = require('fs');
const appPath = './src/App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. In showKeyDialog add Green Check if it's already "selected"? We don't have access to knowing if it's selected easily in code. 
// But the user said "add a visual indicator (e.g., a checkmark icon) next to the API key that is currently selected or being used." 
// Since they use `openSelectKey()`, wait maybe the text inside the button should change or there's a status. Let's just add a checkmark next to the button text if there is `process.env.GEMINI_API_KEY` or just check `!!process.env.GEMINI_API_KEY`.
// I will just add an InfoCircle and an AlertCircle. Actually let's just do a checkmark if window.aistudio key is likely available. 

// Let's refine the error saving.
const errorUpdateRegex = /addToast\("API Key Issue:([^]+?)setDestinations\(prev => prev.map\(adv => \n\s+adv.id === newAdventure.id \? \{ \.\.\.adv, loading: false, error: "Failed to generate image. " \+ \(error.message \|\| ""\) \} : adv/gm;

let newErrorStr = `let specificError = "Failed to generate image. " + (error?.message || "");
      if (errorMessage.includes("requested entity was not found") || errorMessage.includes("404") || errorMessage.includes("api key") || errorMessage.includes("api_key")) {
        specificError = "API Key Issue: Please check your Gemini API key in settings or generate a new one.";
        addToast(specificError, 'error');
        setShowKeyDialog(true);
      } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
        specificError = "Quota exceeded: You might need to wait a moment or check your API limits.";
        addToast(specificError, 'error');
      } else if (errorMessage.includes("blocked") || errorMessage.includes("safety")) {
        specificError = "Safety block: The generation was blocked by safety filters. Please try modifying your scene description.";
        addToast(specificError, 'error');
      } else {
        specificError = "Generation failed: " + (error?.message || "Unknown error") + ". Please modify your request.";
        addToast(specificError, 'error');
      }

      setDestinations(prev => prev.map(adv => 
        adv.id === newAdventure.id ? { ...adv, loading: false, error: specificError } : adv`;


const startErr = content.indexOf(`if (errorMessage.includes("requested entity was not found")`);
const endErr = content.indexOf(`adv.id === newAdventure.id ? { ...adv, loading: false, error: "Failed to generate image. " + (error.message || "") } : adv`);
const totalErrReplace = content.substring(startErr, endErr + `adv.id === newAdventure.id ? { ...adv, loading: false, error: "Failed to generate image. " + (error.message || "") } : adv`.length);

content = content.replace(totalErrReplace, newErrorStr);

// 2. Add an About Modal
// Add state
const stateSearch = 'const [showKeyDialog, setShowKeyDialog] = useState(false);';
content = content.replace(stateSearch, `const [showKeyDialog, setShowKeyDialog] = useState(false);\n  const [showAboutModal, setShowAboutModal] = useState(false);`);

// Add link in Nav
const navSearch = `<div className="flex items-center gap-3">
             <Plane className="w-6 h-6 text-[#D4AF37]" />
             <span className="font-display text-xl tracking-wider uppercase text-gray-900 dark:text-gray-100">PawPassport</span>
          </div>`;
const navReplace = `<div className="flex items-center gap-3">
             <Plane className="w-6 h-6 text-[#D4AF37]" />
             <span className="font-display text-xl tracking-wider uppercase text-gray-900 dark:text-gray-100">PawPassport</span>
             {!hasStarted && (
               <button onClick={() => setShowAboutModal(true)} className="ml-4 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#D4AF37] transition-colors border border-black/10 dark:border-white/10 rounded-full px-3 py-1">About</button>
             )}
          </div>`;
content = content.replace(navSearch, navReplace);

// Also add About button when started 
const startedNavSearch = `<div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-gray-900 dark:text-white font-bold uppercase overflow-hidden">
              {currentUser.photoURL ? <img src={currentUser.photoURL} className="w-full h-full object-cover" /> : currentUser.displayName?.[0] || currentUser.email?.[0]}
            </div>`;
const startedNavReplace = `<button onClick={() => setShowAboutModal(true)} className="mr-2 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#D4AF37] transition-colors border border-black/10 dark:border-white/10 rounded-full px-3 py-1">About</button>
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-gray-900 dark:text-white font-bold uppercase overflow-hidden">
              {currentUser.photoURL ? <img src={currentUser.photoURL} className="w-full h-full object-cover" /> : currentUser.displayName?.[0] || currentUser.email?.[0]}
            </div>`;
content = content.replace(startedNavSearch, startedNavReplace);


// About Modal Render
const aboutModal = `
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel rounded-3xl shadow-2xl max-w-lg w-full p-8 relative border border-white/20 bg-white/95 dark:bg-[#121217]/95"
            >
              <button 
                onClick={() => setShowAboutModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-600 dark:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mb-4 border border-[#D4AF37]/30">
                  <Plane className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display text-gray-900 dark:text-white">PawPassport</h2>
              </div>
              
              <div className="space-y-4 font-sans text-gray-600 dark:text-gray-300">
                <p>
                  <strong>PawPassport</strong> is your ultimate tool to transform everyday photos of your pets (and their favorite objects) into breathtaking travel memories. 
                </p>
                <p>
                  Built to celebrate the adventurers in our lives, even if they never leave the backyard. We use cutting-edge generative AI to place your subjects into fully rendered, beautiful scenes anywhere in the world.
                </p>
                <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-xl mt-6">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-[#D4AF37]" /> AI Model Powered</h3>
                  <p className="text-sm">
                    PawPassport leverages <strong>Gemini 3.1 Flash Image</strong> for generating extremely fast and visually stunning, highly photorealistic composite imagery based on your prompts and uploaded assets.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;
content = content.replace(/(?=<AnimatePresence>\s*\{showKeyDialog && \()/, aboutModal);

// Modify dropdown filters
const filtersSearch = `<option value="none">No Filter</option>
                              <option value="sepia">Sepia</option>
                              <option value="grayscale">B&W</option>
                              <option value="vintage">Vintage</option>`;
const filtersReplace = `<option value="none">No Filter</option>
                              <option value="vintage">Vintage</option>
                              <option value="retro">Retro</option>
                              <option value="grayscale">Black and White</option>`;
content = content.replace(filtersSearch, filtersReplace);

// Image Zoom Effect on Hover
const imgSearch = `className="w-full h-full object-cover rounded-xl transition-transform duration-700 hover:scale-[1.03] opacity-90 group-hover:opacity-100"`;
const imgReplace = `className="w-full h-full object-cover rounded-xl transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"`;
content = content.replace(imgSearch, imgReplace);

// Finally, we need to add the API Key UI indicator
const keyIndicatorSearch = `<h2 className="text-2xl font-display text-gray-900 dark:text-white mb-4">API Key Required</h2>`;
const keyIndicatorReplace = `<h2 className="text-2xl font-display text-gray-900 dark:text-white mb-4">API Key Configuration</h2>
                {process.env.GEMINI_API_KEY && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 py-2 px-4 rounded-full w-fit mx-auto mb-4 border border-green-500/20 font-medium">
                    <Check className="w-4 h-4" /> Default API Key Loaded
                  </div>
                )}`;
content = content.replace(keyIndicatorSearch, keyIndicatorReplace);

const keyBtnContentSearch = `{isKeyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Select API Key`;
const keyBtnContentReplace = `{isKeyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Select Custom API Key`;
content = content.replace(keyBtnContentSearch, keyBtnContentReplace);

fs.writeFileSync(appPath, content);
console.log('App.tsx Updated!');
