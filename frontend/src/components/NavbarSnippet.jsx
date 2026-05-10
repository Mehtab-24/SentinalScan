// Navbar.jsx - About Button Snippet
// 
// Copy and paste this into your existing Navbar component
// Place this within your existing navigation links/map

// ============================================================
// OPTION 1: Simple About Link (Recommended)
// ============================================================
//
// This is the simplest implementation - just a text link with hover effect.
// Copy this directly into your navbar's navigation area:

/*
<a 
  href="/about" 
  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
>
  About
</a>
*/

// ============================================================
// OPTION 2: Active State Detection (With React Router)
// ============================================================
//
// If you're using React Router, this version shows the active state:

/*
import { useLocation, Link } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isAboutPage = location.pathname === '/about';

  return (
    <nav className="...">
      ...other links...
      
      <Link 
        to="/about" 
        className={`
          text-sm font-medium transition-colors
          ${isAboutPage 
            ? 'text-white' 
            : 'text-slate-300 hover:text-white'
          }
        `}
      >
        About
      </Link>
    </nav>
  );
}
*/

// ============================================================
// OPTION 3: Nav Items Array Pattern
// ============================================================
//
// If your navbar uses a mapped array of nav items, add About like this:

/*
const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Scan', href: '/scan' },
  { label: 'Results', href: '/results' },
  { label: 'About', href: '/about' },  // Add this line
];

// Then in your render:
{navItems.map((item) => (
  <a
    key={item.label}
    href={item.href}
    className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
  >
    {item.label}
  </a>
))}
*/

// ============================================================
// OPTION 4: Premium Animated Button
// ============================================================
//
// For a more premium feel with hover animation:

/*
<a
  href="/about"
  className="group relative px-4 py-2 text-sm font-medium text-slate-300 
           hover:text-white transition-colors overflow-hidden"
>
  <span className="relative z-10">About</span>
  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
</a>
*/

// ============================================================
// OPTION 5: With Underline Effect
// ============================================================
//
// If you want an underline that slides in on hover:

/*
<a
  href="/about"
  className="group relative text-sm font-medium text-slate-300 hover:text-white transition-colors"
>
  About
  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 
                 group-hover:w-full transition-all duration-300" />
</a>
*/

// ============================================================
// COMPLETE SNIPPET SUMMARY
// ============================================================
//
// COPY THIS IF YOU JUST WANT THE ESSENTIALS:

const simpleLink = `<a href="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">About</a>`;

const withActiveState = `<Link 
  to="/about" 
  className={\`
    text-sm font-medium transition-colors
    \${isAboutPage ? 'text-white' : 'text-slate-300 hover:text-white'}
  \`}
>
  About
</Link>`;

const withUnderline = `<a
  href="/about"
  className="group relative text-sm font-medium text-slate-300 hover:text-white transition-colors"
>
  About
  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 
                 group-hover:w-full transition-all duration-300" />
</a>`;

export default {
  simpleLink,
  withActiveState,
  withUnderline
};
