import { motion } from "motion/react";
import { 
  ArrowRight, Lock, Key, LayoutGrid, Building, CalendarDays, Database, 
  BarChart2, FileText, Activity, MessageSquare, Mail, PhoneCall, UserCheck, 
  Target, Briefcase, Send, TrendingUp, Bell, ListTodo, FileSignature, 
  Map, Megaphone, PieChart, BookOpen, Zap, Copy, Palette, Plug, Cloud, 
  Cpu, ShieldCheck, UploadCloud, Layers, AlertTriangle, History, Settings, 
  Users, DollarSign, Sliders, Sparkles, Server, Network
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { TRIAL_CTA } from "../lib/cta";
import { useRouteMetadata } from "../lib/pageMetadata";

const MODULE_CATEGORIES = [
  {
    id: "01",
    title: "OPERATIONAL CORE",
    description: "Primary workflow orchestration & strategic data structuring. Workflow systems, business scalability, operational infrastructure.",
    items: [
      {
        name: "Execution Engine",
        icon: LayoutGrid,
        description: "Keeps responsibilities, recurring activity and follow-up aligned so priorities move forward without operational drift."
      },
      {
        name: "Opportunity Flow",
        icon: TrendingUp,
        description: "Provides live visibility across opportunities, next actions and deal progression from first interest through completion."
      },
      {
        name: "Property Grid",
        icon: Building,
        description: "Brings listings, source channels and commercial opportunities into one structured view for faster prioritisation."
      },
      {
        name: "Strategic Delivery",
        icon: Map,
        description: "Turns plans into accountable execution through clear ownership, structured documentation and visible progress."
      },
    ]
  },
  {
    id: "02",
    title: "FINANCIAL INTELLIGENCE",
    description: "Borrowing capacity, cash flow, depreciation integration, and financial operations.",
    items: [
      {
        name: "Lending Position",
        icon: DollarSign,
        description: "Clarifies borrowing capacity and financial readiness before an opportunity or strategy progresses."
      },
      {
        name: "Cash Flow Intelligence",
        icon: Activity,
        description: "Connects current, projected and scenario-based cash flow to support stronger planning and decisions."
      },
      {
        name: "Depreciation Intelligence",
        icon: Layers,
        description: "Integrates depreciation data and comparisons into a more complete financial assessment."
      },
    ]
  },
  {
    id: "03",
    title: "INTELLIGENCE & AI",
    description: "Automated analysis, live telemetry, & generative outputs. Property analysis, scenario modelling, strategic recommendations.",
    items: [
      {
        name: "Property Intelligence",
        icon: BarChart2,
        description: "Converts complex property information into decision-ready insight for stronger assessments and client conversations."
      },
      {
        name: "Scenario Engine",
        icon: PieChart,
        description: "Compares alternative property and financial pathways before recommendations are finalised or presented."
      },
      {
        name: "Decision Intelligence",
        icon: Sparkles,
        description: "Surfaces relevant considerations through AI-assisted analysis that strengthens judgement and strategic discussion."
      },
      {
        name: "Insight Reporting",
        icon: FileText,
        description: "Transforms complex information into clear visual reports clients can understand, trust and act on."
      },
      {
        name: "White-Label Reports",
        icon: Palette,
        description: "Creates polished, organisation-branded reports that reinforce credibility at every client presentation."
      },
    ]
  },
  {
    id: "04",
    title: "CLIENT ECOSYSTEM",
    description: "Secure portals, tracking, & communications logging. CRM workflows, client engagement, lifecycle infrastructure.",
    items: [
      {
        name: "Client Continuum",
        icon: UserCheck,
        description: "Keeps the complete client relationship visible from first engagement through ongoing service."
      },
      {
        name: "Lifecycle Orchestration",
        icon: Users,
        description: "Guides each client through the right stages, actions and responsibilities across the team."
      },
      {
        name: "Engagement Centre",
        icon: MessageSquare,
        description: "Centralises communications and interaction history so every conversation remains informed and timely."
      },
      {
        name: "Client Portal",
        icon: Sliders,
        description: "Provides a secure, branded space for reports, documents, requests and relevant client information.",
        highlight: true
      },
      {
        name: "Finance Portal",
        icon: DollarSign,
        description: "Connect Buyers’ Agents, Finance Partners and Clients through one streamlined finance journey, enabling faster information sharing, real-time progress visibility and smoother collaboration from enquiry through to approval."
      },
      {
        name: "Portfolio Service Hub",
        icon: Briefcase,
        description: "Coordinates portfolio reporting and client requests with clear visibility over progress and next actions."
      },
    ]
  },
  {
    id: "05",
    title: "ENTERPRISE INFRASTRUCTURE",
    description: "Root access, global configurations, API management, administration, governance, and scalability systems.",
    items: [
       {
         name: "Platform Control",
         icon: Settings,
         description: "Centralises configuration, administration and operational oversight across the platform environment."
       },
       {
         name: "Access Governance",
         icon: ShieldCheck,
         description: "Controls users, roles and permissions to protect sensitive information and organisational access."
       },
       {
         name: "Automation Studio",
         icon: Zap,
         description: "Reduces repetitive work through configurable automations and reusable operational structures."
       },
       {
         name: "Integration Fabric",
         icon: Plug,
         description: "Connects external systems and data sources while reducing unnecessary duplication and manual movement."
       },
       {
         name: "Service Resolution Hub",
         icon: AlertTriangle,
         description: "Turns support requests into accountable resolutions through structured ticketing, routing and status tracking."
       },
    ]
  }
];

export default function Resources() {
  useRouteMetadata("/resources");
  return (
    <div className="marketing-page w-full relative pt-32 pb-32 bg-marketing-page min-h-dvh overflow-hidden">
      <HeroBackground variant="resources" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="max-w-4xl mb-24 flex flex-col items-center text-center mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#00A8B5]/5 border border-[#00A8B5]/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,168,181,0.1)]">
             <Server className="w-6 h-6 outline-none" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[clamp(2.4rem,12vw,3rem)] md:text-7xl lg:text-[5rem] font-display font-light tracking-tight mb-8 leading-[1.05]"
          >
            <span className="block text-liquid-chrome drop-shadow-md">Global Sub-System</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Module Library.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-2xl mb-12"
          >
            A comprehensive, unrestricted index of the underlying infrastructure components mapping our entire architectural capacity. The Aurixa Intelligence Centre is a comprehensively aggregated directory of the sub-systems and <Link to="/docs" className="text-[#00A8B5] underline decoration-[#00A8B5]/40 underline-offset-4 hover:text-[#5EDDE8] hover:decoration-[#5EDDE8] transition-colors">governed modules</Link> embedded within the Aurixa operational ecosystem.
          </motion.p>
        </div>

        {/* --- APESHIT MODULE LIBRARY GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32">
          {MODULE_CATEGORIES.map((category, idx) => (
            <motion.div 
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-[1px] rounded-sm group overflow-hidden bg-gradient-to-b from-[#00A8B5]/30 to-transparent shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00A8B5]/10 via-transparent to-[#C89B3C]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="h-full bg-marketing-recessed rounded-sm p-8 relative z-10 flex flex-col">
                {/* Category Header */}
                <div className="flex justify-between items-start border-b border-[#00A8B5]/20 pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[#00A8B5]/50 font-mono text-[10px] tracking-[0.3em]">SEC_{category.id}</span>
                       <div className="h-[1px] w-8 bg-[#C89B3C]/40" />
                    </div>
                    <h2 className="text-xl text-white tracking-widest uppercase font-light">{category.title}</h2>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-mono text-[#00A8B5]/60 max-w-[150px] leading-relaxed uppercase opacity-60">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Sub-item Grid Elements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={itemIdx}
                        className={`group/item flex items-start gap-4 p-4 min-h-[112px] h-full rounded-sm border transition-all duration-300 relative overflow-hidden
                          ${item.highlight
                            ? "bg-[#C89B3C]/10 border-[#C89B3C]/50 shadow-[0_0_20px_rgba(200,155,60,0.15)]"
                            : "bg-marketing-panel/40 border-[#00A8B5]/10 hover:border-[#00A8B5]/40 hover:bg-[#00A8B5]/5"
                          }`}
                      >
                        {/* Glow Sweep Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C89B3C]/5 to-transparent -translate-x-[150%] group-hover/item:translate-x-[150%] transition-transform duration-700 ease-in-out" />

                        <div className={`p-1.5 rounded-sm flex items-center justify-center border mt-0.5 shrink-0 ${item.highlight ? 'bg-[#C89B3C]/20 border-[#C89B3C]/50' : 'bg-marketing-recessed border-[#00A8B5]/20'}`}>
                          <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-[#C89B3C]' : 'text-[#00A8B5]/70 group-hover/item:text-[#00A8B5]'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block text-[12px] uppercase font-mono tracking-wider leading-snug
                            ${item.highlight ? 'text-[#C89B3C] font-semibold' : 'text-gray-400 group-hover/item:text-white'}
                          `}>
                            {item.name}
                          </span>
                          <p className={`mt-2 text-[11px] leading-relaxed font-light
                            ${item.highlight ? 'text-[#D7C79F]/80' : 'text-[#7F8A9A] group-hover/item:text-[#AAB4C3]'}
                          `}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* --- RESTRICTED DEPLOYMENT ARCHIVES (Existing Block but Styled Up) --- */}
        <div className="w-full relative mt-32 mb-12 flex justify-center">
           <div className="absolute w-px h-24 bg-gradient-to-t from-[#C89B3C]/40 to-transparent -top-24 left-1/2 -translate-x-1/2" />
           <div className="w-3 h-3 border border-[#C89B3C] rotate-45 bg-marketing-recessed shadow-[0_0_10px_#C89B3C] z-10" />
        </div>

        <div className="max-w-4xl mx-auto glass-panel p-6 sm:p-16 text-center border-t-2 border-b-2 border-[#C89B3C]/50 shadow-[0_0_50px_rgba(200,155,60,0.05)] relative overflow-hidden bg-gradient-to-b from-marketing-panel/30 to-marketing-recessed/80 backdrop-blur-md">
           <div className="absolute inset-0 bg-chrome-prismatic opacity-[0.02] pointer-events-none mix-blend-screen" />
           
           {/* Radar sweep background effect for the locked box */}
           <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 overflow-hidden opacity-10 pointer-events-none">
              <div className="w-full h-full border border-dashed border-[#C89B3C]/30 rounded-full animate-[spin-ultra-slow_20s_linear_infinite]" />
           </div>

           <div className="relative z-10 flex flex-col items-center">
             <div className="relative w-16 h-16 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border border-[#C89B3C]/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-2 border border-[#C89B3C]/50 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                <Lock className="w-8 h-8 relative z-10" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
             </div>
             
             <h2 className="text-3xl font-display font-light text-white mb-6 tracking-wide drop-shadow-md">RESTRICTED ARCHIVES</h2>
             <p className="text-[#00A8B5]/80 font-mono text-[11px] leading-relaxed mb-10 max-w-xl uppercase tracking-widest text-center">
               Live deployment demonstrations and proprietary operational blueprints are walled off from general traffic. Access requires an authorized partner protocol link. Explore the ecosystem to access structured operational intelligence, automation systems, reporting infrastructure, and enterprise support.
             </p>
             <Link to={TRIAL_CTA.to} className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] uppercase tracking-[0.25em] font-bold text-[#040B16] bg-gradient-to-r from-[#C89B3C] to-[#E2C78C] rounded-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.3)] hover:shadow-[0_0_50px_rgba(200,155,60,0.5)]">
               <span className="drop-shadow-sm font-black text-balance">{TRIAL_CTA.label}</span>
               <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform stroke-[#040B16] drop-shadow-sm" style={{ strokeWidth: 2 }}/>
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
