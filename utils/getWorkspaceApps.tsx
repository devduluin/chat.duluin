import { FileText, Box, Database, Settings, Book, MessageSquare, Video, Briefcase, CheckCircle, Package, LayoutGrid, BarChart, Workflow, ArrowRight, ClipboardList } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";

  export const workspaceApps = [
  // Core Apps (Available)
    {
      id: 'forms',
      name: "Form Builder",
      description: "Create beautiful forms and surveys with drag-and-drop",
      icon: <FileText className="w-8 h-8 text-white" />,
      href: "/forms",
      category: "Productivity",
      status: "live",
      featured: true,
      colorClass: "bg-gradient-to-r from-blue-500 to-blue-700 text-white",
      capabilities: ["Drag & Drop", "Templates", "Analytics"],
      comingSoon: false,
      previewPlaceholder: (
        <div className="bg-white p-2 w-full h-full flex items-center justify-center">
          <div className="border-2 border-dashed border-gray-200 rounded-lg w-full h-full flex items-center justify-center">
            <Image
              src='/assets/images/form_builder.png'
              alt='Create beautiful forms and surveys with drag-and-drop'
              width={200}
              height={100}
              className="object-contain h-full w-full cursor-zoom-in"
            />
          </div>
        </div>
      )
    },
    // HR & Admin
    {
      id: 'hr-system',
      name: "HRMS Tools",
      description: "Manage employees, leave, and performance",
      icon: <Briefcase className="w-8 h-8 text-white" />,
      category: "Administration",
      status: "planned",
      colorClass: "bg-gradient-to-r from-blue-600 to-indigo-700 text-white",
      capabilities: ["Leave Management", "Onboarding", "Performance Reviews"],
      comingSoon: false,
      previewPlaceholder: (
        <div className="bg-white p-2 w-full h-full flex items-center justify-center">
          <div className="border-2 border-dashed border-gray-200 rounded-lg w-full h-full flex items-center justify-center">
            <Image
              src='/assets/images/hrms.png'
              alt='Create beautiful forms and surveys with drag-and-drop'
              width={200}
              height={100}
              className="object-contain h-full w-full cursor-zoom-in"
            />
          </div>
        </div>
      )
    },
    {
      id: 'modules',
      name: "Module Builder",
      description: "Build custom modules Apps with low-code interface",
      icon: <Box className="w-8 h-8 text-white" />,
      href: "#",
      category: "Development",
      status: "live",
      featured: true,
      colorClass: "bg-gradient-to-r from-purple-500 to-purple-700 text-white",
      capabilities: ["Low-Code", "API Integration", "Custom Logic"],
      comingSoon: true
    },

    // Communication Apps
    {
      id: 'team-chat',
      name: "Team Chat",
      description: "Real-time messaging with file sharing and threads",
      icon: <MessageSquare className="w-8 h-8 text-white" />,
      href: "#",
      category: "Communication",
      status: "beta",
      colorClass: "bg-gradient-to-r from-green-500 to-green-700 text-white",
      capabilities: ["Channels", "Video Calls", "File Sharing"],
      comingSoon: true
    },
    {
      id: 'meetings',
      name: "Video Meetings",
      description: "HD video conferencing with screen sharing",
      icon: <Video className="w-8 h-8 text-white" />,
      category: "Communication",
      status: "planned",
      colorClass: "bg-gradient-to-r from-red-500 to-red-700 text-white",
      comingSoon: true
    },

    {
      id: 'project-management',
      name: "Project Management",
      description: "Organize tasks, track progress, and manage your team efficiently",
      icon: <ClipboardList className="w-8 h-8 text-white" />, // Lucide icon
      href: "#",
      category: "Productivity",
      status: "live",
      featured: true,
      colorClass: "bg-gradient-to-r from-indigo-500 to-indigo-700 text-white",
      capabilities: ["Task Boards", "Team Collaboration", "Deadline Tracking"],
      comingSoon: false
    },

    {
      id: 'approvals',
      name: "Approval Workflows",
      description: "Create and track approval processes",
      icon: <CheckCircle className="w-8 h-8 text-white" />,
      category: "Administration",
      status: "planned",
      colorClass: "bg-gradient-to-r from-emerald-500 to-emerald-700 text-white",
      comingSoon: true
    },

    // Workflow Automation
    {
      id: 'workflows',
      name: "Workflow Automator",
      description: "Automate business processes across apps",
      icon: <Workflow className="w-8 h-8 text-white" />,
      category: "Automation",
      status: "planned",
      colorClass: "bg-gradient-to-r from-orange-500 to-orange-700 text-white",
      capabilities: ["Triggers", "Actions", "Multi-Step Flows"],
      comingSoon: true
    },

    // Additional Tools
    {
      id: 'knowledge-base',
      name: "Knowledge Base",
      description: "Central documentation and wiki for your team",
      icon: <Book className="w-8 h-8 text-white" />,
      category: "Productivity",
      status: "planned",
      colorClass: "bg-gradient-to-r from-violet-500 to-violet-700 text-white",
      comingSoon: true
    },
    {
      id: 'asset-manager',
      name: "Asset Manager",
      description: "Organize and track company assets",
      icon: <Package className="w-8 h-8 text-white" />,
      category: "Operations",
      status: "planned",
      colorClass: "bg-gradient-to-r from-lime-500 to-lime-700 text-white",
      comingSoon: true
    },

    // Data & Analytics
    {
      id: 'data-manager',
      name: "Data Manager",
      description: "Centralized data storage and management",
      icon: <Database className="w-8 h-8 text-white" />,
      category: "Data",
      status: "development",
      colorClass: "bg-gradient-to-r from-indigo-500 to-indigo-700 text-white",
      capabilities: ["SQL Query", "Data Modeling", "Import/Export"],
      comingSoon: true
    },
    {
      id: 'analytics',
      name: "Analytics Dashboard",
      description: "Visualize and explore your business data",
      icon: <BarChart className="w-8 h-8 text-white" />,
      category: "Data",
      status: "planned",
      colorClass: "bg-gradient-to-r from-cyan-500 to-cyan-700 text-white",
      comingSoon: true
    },
  ];