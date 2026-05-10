import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, GitBranch, Container, BarChart3, ChevronRight, Shield } from 'lucide-react';

const HelpWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      icon: GitBranch,
      title: 'Clone Repository',
      description: 'Connect your Git repository via SSH or HTTPS. SentinelScan creates an isolated branch for secure analysis without affecting your main codebase.',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: Container,
      title: 'Containerized Scan',
      description: 'Your code runs in a hardened Docker container with zero network access. Our heuristic engine performs static analysis, dependency scanning, and secret detection.',
      color: 'from-violet-500 to-purple-500',
    },
    {
      icon: BarChart3,
      title: 'Analyze Results',
      description: 'Review comprehensive security reports with CVSS scores, remediation guidance, and trend analysis. Export findings to Jira, Slack, or your SIEM.',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full 
                   bg-gradient-to-br from-cyan-500/20 to-blue-500/20 
                   backdrop-blur-xl border border-white/20
                   shadow-[0_0_20px_rgba(6,182,212,0.4)]
                   flex items-center justify-center
                   hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]
                   transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <Info className="w-6 h-6 text-cyan-400" />
        
        {/* Pulse Animation Ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-cyan-400/20" />
      </motion.button>

      {/* Overlay Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Side Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-xl
                         bg-[#0A0A0B]/90 backdrop-blur-2xl 
                         border-l border-white/10
                         shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-semibold text-white">How SentinelScan Works</h2>
                  <p className="text-sm text-slate-400 mt-1">Your complete guide to secure code analysis</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 
                           border border-white/10 hover:border-white/20
                           transition-all duration-200"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
                {/* Steps */}
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative p-5 rounded-xl
                               bg-gradient-to-br from-white/5 to-white/[0.02]
                               border border-white/10 hover:border-white/20
                               transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${step.color} shadow-lg`}>
                          <step.icon className="w-5 h-5 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500">
                              Step {index + 1}
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                          </div>
                          <h3 className="text-base font-semibold text-white mb-1">
                            {step.title}
                          </h3>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Tips */}
                <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-2">Quick Tips</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500 mt-1">•</span>
                      <span>Upload your repository or connect via Git URL</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500 mt-1">•</span>
                      <span>Scans run in isolated Docker containers for security</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500 mt-1">•</span>
                      <span>Results include CVSS scores and remediation paths</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpWidget;
