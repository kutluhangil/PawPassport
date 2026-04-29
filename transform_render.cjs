const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace the if (!hasStarted) block
const ifStartIdx = content.indexOf('if (!hasStarted) {');
const firstReturnStart = content.indexOf('return (', ifStartIdx);
const firstReturnEnd = content.indexOf('    );\n  }\n\n  return (', firstReturnStart);

if (ifStartIdx === -1 || firstReturnStart === -1 || firstReturnEnd === -1) {
  console.log('Could not find the injection points');
  process.exit(1);
}

const landingPageContent = content.substring(firstReturnStart + 'return ('.length, firstReturnEnd).trim();
const studioPageContent = content.substring(content.indexOf('  return (', firstReturnEnd) + '  return ('.length, content.length - 2).trim();

// make sure to remove the duplicated <audio> from landingPageContent
let cleanLanding = landingPageContent.replace(/<audio ref=\{audioRef\} loop src="https:\/\/codeskulptor-demos.commondatastorage.googleapis.com\/GalaxyInvaders\/theme_01.mp3" \/>/g, '');

const newRender = `
  return (
    <>
      <audio ref={audioRef} loop src="https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3" />
      <div className="fixed bottom-4 left-4 z-[999] flex items-center gap-3 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-lg">
        <button onClick={toggleMusic} className="text-white hover:text-[#D4AF37] transition focus:outline-none">
          {isMusicPlaying ? <Music className="w-5 h-5"/> : <VolumeX className="w-5 h-5" />}
        </button>
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 accent-[#D4AF37]"
        />
      </div>

      {!hasStarted ? (
        ${cleanLanding}
      ) : (
        ${studioPageContent}
      )}
    </>
  );
}
`;

const newContent = content.substring(0, ifStartIdx) + newRender;
fs.writeFileSync(path, newContent);
console.log('App.tsx transformed main render structure!');
