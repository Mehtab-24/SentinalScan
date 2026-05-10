import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  Container, 
  Search, 
  TrendingUp, 
  Lock,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  Server,
  Cpu,
  ArrowLeft
} from 'lucide-react';

const AboutPage = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const stats = [
    { value: '$4.5M', label: 'Average Breach Cost', icon: AlertTriangle },
    { value: '78%', label: 'Vulnerabilities in Dependencies', icon: Lock },
    { value: '240%', label: 'YoY Supply Chain Attacks', icon: TrendingUp },
  ];

  const architectureFeatures = [
    {
      icon: Container,
      title: 'Isolated Docker Environment',
      description: 'Every scan runs in a fresh, ephemeral container with zero network access, ensuring complete isolation and preventing cross-contamination between scans.',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: Search,
      title: 'Heuristic Pattern Analysis',
      description: 'Multi-layered detection combining signature matching, behavioral analysis, and ML-powered anomaly detection to catch zero-day vulnerabilities.',
      color: 'from-violet-500 to-purple-500',
    },
    {
      icon: Server,
      title: 'Real-time Processing Engine',
      description: 'Sub-second ingestion with streaming analysis results. Our event-driven architecture provides immediate feedback on critical security issues.',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Globe,
      title: 'Universal Integration Hub',
      description: 'Native GitHub, GitLab, Bitbucket, and Azure DevOps support with webhook-driven CI/CD pipeline integration and PR-level scanning.',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const businessImpacts = [
    {
      stat: '$2.3M',
      label: 'Average Savings',
      description: 'Annual cost avoidance from early vulnerability detection and prevention of production incidents.',
      icon: CheckCircle2
    },
    {
      stat: '94%',
      label: 'Faster Remediation',
      description: 'Reduction in mean time to patch critical vulnerabilities through automated PR suggestions.',
      icon: CheckCircle2
    },
    {
      stat: 'Zero',
      label: 'Production Breaches',
      description: 'Security incidents in production for codebases scanned by SentinelScan pre-deployment.',
      icon: CheckCircle2
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] relative overflow-hidden z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        {/* Radial Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_50%)]" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Back Button */}
        <div className="fixed top-24 left-6 lg:left-12 z-50">
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-white/5 border border-white/10 
                       text-slate-400 hover:text-white hover:bg-white/10
                       transition-all duration-300 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </Link>
        </div>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              className="text-center"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div 
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                         bg-cyan-500/10 border border-cyan-500/20 mb-6"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">Enterprise Security Platform</span>
              </motion.div>

              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Why{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
                  SentinelScan
                </span>
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
              >
                We're redefining software supply chain security with an architecture 
                built for the modern enterprise — where speed meets uncompromising protection.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-20 px-6 lg:px-12 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">The Problem</h2>
              </div>
              <p className="text-slate-400 max-w-3xl leading-relaxed">
                Modern software supply chains have become attack vectors. With 78% of vulnerabilities 
                now hiding in third-party dependencies, traditional static analysis tools are no longer sufficient 
                to protect enterprise codebases at scale.
              </p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group p-6 rounded-2xl bg-white/[0.02] border border-white/10 
                           hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                      <stat.icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Architecture Section */}
        <section className="py-20 px-6 lg:px-12 border-t border-white/5 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                            bg-violet-500/10 border border-violet-500/20 mb-6">
                <Container className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-violet-400">Next-Gen Architecture</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Our Architecture
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Built from the ground up for security-first enterprises. Our isolated Docker 
                architecture combined with advanced heuristic scanning delivers unmatched protection.
              </p>
            </motion.div>

            {/* Architecture Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {architectureFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative p-6 rounded-2xl overflow-hidden
                           bg-gradient-to-br from-white/[0.05] to-white/[0.02]
                           border border-white/10 hover:border-white/20
                           transition-all duration-500"
                >
                  {/* Hover Gradient Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 
                                    border border-white/10 group-hover:border-white/20
                                    transition-all duration-300">
                        <feature.icon className="w-6 h-6 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2 
                                     group-hover:text-cyan-300 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Market Impact Section */}
        <section className="py-20 px-6 lg:px-12 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                            bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Market Impact</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                The Bottom Line
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Catching vulnerabilities at the PR level doesn't just improve security—
                it transforms your entire development economics.
              </p>
            </motion.div>

            {/* Impact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {businessImpacts.map((impact, index) => (
                <motion.div
                  key={impact.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative p-6 rounded-2xl overflow-hidden
                           bg-gradient-to-br from-white/[0.05] to-transparent
                           border border-white/10 hover:border-emerald-500/30
                           transition-all duration-500"
                >
                  {/* Glow Effect */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 
                                bg-emerald-500/20 rounded-full blur-3xl 
                                group-hover:bg-emerald-500/30 transition-all duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <impact.icon className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider">
                        {impact.label}
                      </span>
                    </div>
                    <p className="text-4xl font-bold text-white mb-3 
                                group-hover:text-emerald-300 transition-colors">
                      {impact.stat}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {impact.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative p-8 md:p-12 rounded-3xl overflow-hidden"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-emerald-500/10" />
              <div className="absolute inset-0 backdrop-blur-xl" />
              <div className="absolute inset-0 border border-white/10 rounded-3xl" />
              
              {/* Content */}
              <div className="relative z-10 text-center">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Ready to Secure Your Supply Chain?
                </h3>
                <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                  Join leading enterprises who've transformed their security posture. 
                  Start catching vulnerabilities before they reach production.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 
                               text-white font-semibold shadow-lg shadow-cyan-500/25
                               hover:shadow-cyan-500/40 transition-all duration-300
                               flex items-center gap-2"
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </Link>
                  <a 
                    href="https://docs.sentinelscan.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 
                               text-slate-300 font-medium hover:bg-white/10 hover:text-white
                               transition-all duration-300"
                    >
                      View Documentation
                    </motion.button>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 lg:px-12 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-semibold">SentinelScan</span>
              </div>
              <p className="text-sm text-slate-500">
                Securing the software supply chain for modern enterprises.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AboutPage;
