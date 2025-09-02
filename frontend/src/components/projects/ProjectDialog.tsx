import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IssuerDocumentList from "../documents/IssuerDocumentList";
import {
  FileText,
  CreditCard,
  FileCheck,
  File,
  CheckSquare,
  Shield,
  Building,
  DollarSign,
  BarChart,
  Clock,
  AlertTriangle,
  Users
} from "lucide-react";
import { IssuerDocumentType } from "@/types/core/centralModels";
import {
  IssuerCreditworthinessUpload,
  ProjectSecurityTypeUpload,
  OfferingDetailsUpload,
  TermSheetUpload,
  SpecialRightsUpload,
  UnderwritersUpload,
  UseProceedsUpload,
  FinancialHighlightsUpload,
  TimingUpload,
  RiskFactorsUpload,
  LegalRegulatoryComplianceUpload
} from "../documents/IssuerDocumentUpload";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RegulatoryExemptionsField from "./RegulatoryExemptionsField";
import { OrganizationAssignmentService } from '@/components/organizations';
import { supabase } from '@/infrastructure/database/client';

// Form validation schema
// Form validation schema
const projectFormSchema = z.object({
  // Basic Info Fields
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  status: z.string().min(1, { message: "Please select a status." }),
  project_type: z.string().min(1, { message: "Please select a project type." }),
  investment_status: z.string().min(1, { message: "Please select an investment status." }),
  is_primary: z.boolean().default(false),
  organization_id: z.string().optional(), // Optional since it may be set automatically
  
  // Financial Fields
  currency: z.string().min(1, { message: "Please select a currency." }).default("USD"),
  token_symbol: z.string().optional(),
  total_notional: z.string().optional(),
  target_raise: z.string().optional(),
  minimum_investment: z.string().optional(),
  estimated_yield_percentage: z.union([z.string(), z.number()]).optional(),
  
  // Dates Fields
  duration: z.string().optional(),
  subscription_start_date: z.string().optional(),
  subscription_end_date: z.string().optional(),
  transaction_start_date: z.string().optional(),
  maturity_date: z.string().optional(),
  
  // Legal Fields
  legal_entity: z.string().optional(),
  jurisdiction: z.string().optional(),
  tax_id: z.string().optional(),
  regulatory_exemptions: z.array(z.string()).default([]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormValues) => void | Promise<void>;
  isProcessing: boolean;
  title: string;
  description: string;
  defaultValues?: any;
}

const ProjectDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isProcessing,
  title,
  description,
  defaultValues,
}: ProjectDialogProps) => {
  // Initialize form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft",
      project_type: "equity",
      investment_status: "Open",
      organization_id: "",
      token_symbol: "",
      total_notional: "",
      target_raise: "",
      legal_entity: "",
      jurisdiction: "",
      tax_id: "",
      is_primary: false,
      estimated_yield_percentage: "",
      duration: "",
      subscription_start_date: "",
      subscription_end_date: "",
      transaction_start_date: "",
      maturity_date: "",
      minimum_investment: "",
      currency: "USD",
      regulatory_exemptions: [],
    },
  });

  // State for the active tab - always default to "basic" for new projects and edits
  const [activeTab, setActiveTab] = useState("basic");
  // State for active document category
  const [activeDocCategory, setActiveDocCategory] = useState("essential");
  // State for organization assignment sync
  const [assignedOrganization, setAssignedOrganization] = useState<{id: string; name: string; legalName?: string} | null>(null);
  const [loadingOrganization, setLoadingOrganization] = useState(false);

  // Reset active tab to "basic" when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("basic");
    }
  }, [open]);

  // Load organization assignment for existing projects
  useEffect(() => {
    if (open && defaultValues?.id) {
      loadOrganizationAssignment(defaultValues.id);
    } else {
      setAssignedOrganization(null);
    }
  }, [open, defaultValues?.id]);

  const loadOrganizationAssignment = async (projectId: string) => {
    try {
      setLoadingOrganization(true);
      // Check project_organization_assignments first (master)
      const assignments = await OrganizationAssignmentService.getProjectOrganizationAssignments(projectId);
      
      if (assignments.length > 0) {
        // Use the first assignment found (assuming one primary organization per project)
        const assignment = assignments[0];
        setAssignedOrganization({
          id: assignment.organizationId,
          name: assignment.organizationName || 'Unknown Organization',
          legalName: assignment.organizationLegalName
        });
      } else {
        // No assignment found, clear state
        setAssignedOrganization(null);
      }
    } catch (error) {
      console.error('Failed to load organization assignment:', error);
      setAssignedOrganization(null);
    } finally {
      setLoadingOrganization(false);
    }
  };

  const createOrganizationAssignment = async (projectId: string, organizationId: string) => {
    try {
      // Create basic project organization assignment with 'issuer' as default relationship
      await OrganizationAssignmentService.assignProjectToOrganization(
        projectId,
        organizationId,
        'issuer', // Default relationship type
        'Auto-created from project dialog'
      );
    } catch (error) {
      console.error('Failed to create organization assignment:', error);
      // Don't throw - assignment creation failure shouldn't block project creation
    }
  };

  const handleFormSubmit = async (data: ProjectFormValues) => {
    try {
      // Call the original onSubmit handler first
      await onSubmit(data);
      
      // Handle organization assignment sync for edit mode only
      if (defaultValues?.id) {
        // Edit mode - handle organization assignment logic
        if (data.organization_id) {
          // Organization is selected
          if (!assignedOrganization || assignedOrganization.id !== data.organization_id) {
            // Create assignment if none exists or organization changed
            await createOrganizationAssignment(defaultValues.id, data.organization_id);
            // Reload the assignment to show the new data
            await loadOrganizationAssignment(defaultValues.id);
          }
        }
      }
      
      // For create mode, the calling component (ProjectsList.tsx) is responsible 
      // for creating the project_organization_assignments record after project creation
    } catch (error) {
      // Re-throw the error to maintain form error handling
      throw error;
    }
  };
  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        name: defaultValues.name || "",
        description: defaultValues.description || "",
        status: defaultValues.status || "draft",
        project_type: defaultValues.project_type || "equity",
        investment_status: defaultValues.investment_status || "Open",
        organization_id: defaultValues.organization_id || "",
        token_symbol: defaultValues.token_symbol || "",
        total_notional: defaultValues.total_notional?.toString() || "",
        target_raise: defaultValues.target_raise?.toString() || "",
        legal_entity: defaultValues.legal_entity || "",
        jurisdiction: defaultValues.jurisdiction || "",
        tax_id: defaultValues.tax_id || "",
        is_primary: defaultValues.is_primary === true,
        estimated_yield_percentage: defaultValues.estimated_yield_percentage || "",
        duration: defaultValues.duration || "",
        subscription_start_date: defaultValues.subscription_start_date || "",
        subscription_end_date: defaultValues.subscription_end_date || "",
        transaction_start_date: defaultValues.transaction_start_date || "",
        maturity_date: defaultValues.maturity_date || "",
        minimum_investment: defaultValues.minimum_investment?.toString() || "",
        currency: defaultValues.currency || "USD",
        regulatory_exemptions: defaultValues.regulatory_exemptions || [],
      });
    } else if (open) {
      form.reset({
        name: "",
        description: "",
        status: "draft",
        project_type: "equity",
        investment_status: "Open",
        organization_id: "",
        token_symbol: "",
        total_notional: "",
        target_raise: "",
        legal_entity: "",
        jurisdiction: "",
        tax_id: "",
        is_primary: false,
        estimated_yield_percentage: "",
        duration: "",
        subscription_start_date: "",
        subscription_end_date: "",
        transaction_start_date: "",
        maturity_date: "",
        minimum_investment: "",
        currency: "USD",
        regulatory_exemptions: [],
      });
    }
  }, [open, defaultValues, form]);

  // Enhanced project type options organized by category
  const projectTypeCategories = {
    traditional: [
      { value: "structured_products", label: "Structured Products", description: "Complex financial instruments with multiple components" },
      { value: "equity", label: "Equity", description: "Ownership shares in a company" },
      { value: "commodities", label: "Commodities", description: "Physical goods and raw materials" },
      { value: "funds_etfs_etps", label: "Funds, ETFs, ETPs", description: "Pooled investment vehicles" },
      { value: "bonds", label: "Bonds", description: "Debt securities with fixed income" },
      { value: "quantitative_investment_strategies", label: "Quantitative Investment Strategies", description: "Algorithm-based investment approaches" },
    ],
    alternative: [
      { value: "private_equity", label: "Private Equity", description: "Private company ownership and buyouts" },
      { value: "private_debt", label: "Private Debt", description: "Non-public debt instruments" },
      { value: "real_estate", label: "Real Estate", description: "Property and real estate investments" },
      { value: "energy", label: "Energy", description: "Energy sector investments" },
      { value: "infrastructure", label: "Infrastructure", description: "Infrastructure and utility investments" },
      { value: "collectibles", label: "Collectibles & Other Assets", description: "Art, collectibles, and alternative investments" },
      { value: "receivables", label: "Asset Backed Securities / Receivables", description: "Invoice receivables and asset-backed securities" },
      { value: "solar_wind_climate", label: "Solar and Wind Energy, Climate Receivables", description: "Renewable energy and climate finance" },
    ],
    digital: [
      { value: "digital_tokenised_fund", label: "Digital Tokenised Fund", description: "Blockchain-based tokenized investment funds" },
      { value: "fiat_backed_stablecoin", label: "Fiat-Backed Stablecoin", description: "Stablecoin backed by fiat currency reserves" },
      { value: "crypto_backed_stablecoin", label: "Crypto-Backed Stablecoin", description: "Stablecoin backed by cryptocurrency collateral" },
      { value: "commodity_backed_stablecoin", label: "Commodity-Backed Stablecoin", description: "Stablecoin backed by commodity reserves" },
      { value: "algorithmic_stablecoin", label: "Algorithmic Stablecoin", description: "Stablecoin maintained through algorithmic mechanisms" },
      { value: "rebasing_stablecoin", label: "Rebasing Stablecoin", description: "Stablecoin with elastic supply mechanism" },
    ]
  };

  // Helper function to get project type label from value
  const getProjectTypeLabel = (value: string): string => {
    // Flatten all categories
    const allOptions = [
      ...projectTypeCategories.traditional,
      ...projectTypeCategories.alternative,
      ...projectTypeCategories.digital
    ];
    
    // Find the option with matching value
    const option = allOptions.find(opt => opt.value === value);
    
    // Return just the label, or the value if option not found
    return option ? option.label : value;
  };

  // Options for funding rounds
  const fundingRoundOptions = [
    { value: "pre_seed", label: "Pre-Seed" },
    { value: "seed", label: "Seed" },
    { value: "series_a", label: "Series A" },
    { value: "series_b", label: "Series B" },
    { value: "series_c", label: "Series C" },
    { value: "series_d", label: "Series D+" },
    { value: "growth", label: "Growth" },
    { value: "mezzanine", label: "Mezzanine" },
    { value: "pre_ipo", label: "Pre-IPO" },
  ];

  // Simplified document categories with only the essential ones
  const documentCategories = [
    {
      id: "essential",
      label: "Essential Documents",
      icon: <FileText className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.TERM_SHEET,
        IssuerDocumentType.OFFERING_DETAILS
      ],
      description: "Critical project documents required for investors"
    },
    {
      id: "financial",
      label: "Financial",
      icon: <BarChart className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.FINANCIAL_HIGHLIGHTS, 
        IssuerDocumentType.USE_OF_PROCEEDS
      ],
      description: "Financial information and projections"
    },
    {
      id: "legal",
      label: "Legal & Risk",
      icon: <Shield className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.SPECIAL_RIGHTS, 
        IssuerDocumentType.RISK_FACTORS,
        IssuerDocumentType.LEGAL_REGULATORY_COMPLIANCE
      ],
      description: "Legal rights, terms, and risk information"
    }
  ];

  // Map document types to their upload components
  const getUploadComponent = (type: IssuerDocumentType) => {
    const props = {
      projectId: defaultValues?.id,
      onDocumentUploaded: () => {
        // Force refresh of document list
        const event = new CustomEvent('document-uploaded');
        window.dispatchEvent(event);
      }
    };
    
    switch (type) {
      case IssuerDocumentType.ISSUER_CREDITWORTHINESS:
        return <IssuerCreditworthinessUpload {...props} />;
      case IssuerDocumentType.PROJECT_SECURITY_TYPE:
        return <ProjectSecurityTypeUpload {...props} />;
      case IssuerDocumentType.OFFERING_DETAILS:
        return <OfferingDetailsUpload {...props} />;
      case IssuerDocumentType.TERM_SHEET:
        return <TermSheetUpload {...props} />;
      case IssuerDocumentType.SPECIAL_RIGHTS:
        return <SpecialRightsUpload {...props} />;
      case IssuerDocumentType.UNDERWRITERS:
        return <UnderwritersUpload {...props} />;
      case IssuerDocumentType.USE_OF_PROCEEDS:
        return <UseProceedsUpload {...props} />;
      case IssuerDocumentType.FINANCIAL_HIGHLIGHTS:
        return <FinancialHighlightsUpload {...props} />;
      case IssuerDocumentType.TIMING:
        return <TimingUpload {...props} />;
      case IssuerDocumentType.RISK_FACTORS:
        return <RiskFactorsUpload {...props} />;
      case IssuerDocumentType.LEGAL_REGULATORY_COMPLIANCE:
        return <LegalRegulatoryComplianceUpload {...props} />;
      default:
        return null;
    }
  };

  // Get icon for document type
  const getDocumentTypeIcon = (type: IssuerDocumentType) => {
    switch (type) {
      case IssuerDocumentType.ISSUER_CREDITWORTHINESS:
        return <CreditCard className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.PROJECT_SECURITY_TYPE:
        return <Shield className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.OFFERING_DETAILS:
        return <File className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.TERM_SHEET:
        return <FileText className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.SPECIAL_RIGHTS:
        return <CheckSquare className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.UNDERWRITERS:
        return <Building className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.USE_OF_PROCEEDS:
        return <DollarSign className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.FINANCIAL_HIGHLIGHTS:
        return <BarChart className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.TIMING:
        return <Clock className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.RISK_FACTORS:
        return <AlertTriangle className="h-4 w-4 mr-2" />;
      case IssuerDocumentType.LEGAL_REGULATORY_COMPLIANCE:
        return <Shield className="h-4 w-4 mr-2" />;
      default:
        return <FileText className="h-4 w-4 mr-2" />;
    }
  };

  // Helper to format document type label
  const formatDocumentTypeLabel = (type: string) => {
    if (type === IssuerDocumentType.OFFERING_DETAILS) {
      return "Prospectus Details";
    }
    return type.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Add currency options
  const currencies = [
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "INR", name: "Indian Rupee" },
    { code: "MXN", name: "Mexican Peso" },
    { code: "BRL", name: "Brazilian Real" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "NOK", name: "Norwegian Krone" },
    { code: "DKK", name: "Danish Krone" },
    { code: "ZAR", name: "South African Rand" },
    { code: "AED", name: "UAE Dirham" },
    { code: "SAR", name: "Saudi Riyal" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {defaultValues ? (
              <Save className="h-5 w-5 text-primary" />
            ) : (
              <Plus className="h-5 w-5 text-primary" />
            )}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="dates">Key Dates</TabsTrigger>
                <TabsTrigger value="legal">Legal</TabsTrigger>
                {defaultValues?.id && <TabsTrigger value="documents">Documents</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter project description"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft" className="py-1.5">Draft</SelectItem>
                            <SelectItem value="active" className="py-1.5">Active</SelectItem>
                            <SelectItem value="completed" className="py-1.5">Completed</SelectItem>
                            <SelectItem value="cancelled" className="py-1.5">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {field.value ? getProjectTypeLabel(field.value) : "Select project type"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[400px] overflow-y-auto">
                            {/* Traditional Assets */}
                            <div className="p-2 bg-blue-50 border-b border-blue-100">
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                                Traditional Assets
                              </span>
                            </div>
                            {projectTypeCategories.traditional.map((option) => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                className="pl-3 pr-2 py-2 border-b border-slate-100 last:border-0 focus:bg-slate-50 focus:text-primary data-[highlighted]:bg-slate-50"
                              >
                                <span className="font-medium text-sm">{option.label}</span>
                                <span className="block text-xs text-slate-500 mt-0.5 pr-2">{option.description}</span>
                              </SelectItem>
                            ))}
                            
                            {/* Alternative Assets */}
                            <div className="p-2 bg-orange-50 border-b border-orange-100">
                              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                                Alternative Assets
                              </span>
                            </div>
                            {projectTypeCategories.alternative.map((option) => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                className="pl-3 pr-2 py-2 border-b border-slate-100 last:border-0 focus:bg-slate-50 focus:text-primary data-[highlighted]:bg-slate-50"
                              >
                                <span className="font-medium text-sm">{option.label}</span>
                                <span className="block text-xs text-slate-500 mt-0.5 pr-2">{option.description}</span>
                              </SelectItem>
                            ))}
                            
                            {/* Digital Assets */}
                            <div className="p-2 bg-purple-50 border-b border-purple-100">
                              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                                Digital Assets
                              </span>
                            </div>
                            {projectTypeCategories.digital.map((option) => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                className="pl-3 pr-2 py-2 border-b border-slate-100 last:border-0 focus:bg-slate-50 focus:text-primary data-[highlighted]:bg-slate-50"
                              >
                                <span className="font-medium text-sm">{option.label}</span>
                                <span className="block text-xs text-slate-500 mt-0.5 pr-2">{option.description}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the asset class that best describes your project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="investment_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select investment status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Open" className="py-1.5">Open</SelectItem>
                            <SelectItem value="Closed" className="py-1.5">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Whether the project is open or closed for investment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organization_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        {defaultValues?.id ? (
                          // Edit mode - show organization as read-only if assignment exists
                          <div className="p-3 bg-muted rounded-lg">
                            {loadingOrganization ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading organization...</span>
                              </div>
                            ) : assignedOrganization ? (
                              <div>
                                <div className="font-medium">{assignedOrganization.name}</div>
                                {assignedOrganization.legalName && assignedOrganization.legalName !== assignedOrganization.name && (
                                  <div className="text-sm text-muted-foreground">{assignedOrganization.legalName}</div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Organization ID: {assignedOrganization.id}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-muted-foreground">No organization assigned</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Use project management tools to assign organizations
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Create mode - show dropdown selector
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select organization" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Using actual organization IDs from the database */}
                              <SelectItem value="689a0933-a0f4-4665-8de7-9a701dd67580" className="py-1.5">Metro Real Estate Fund LP</SelectItem>
                              <SelectItem value="2500d887-df60-4edd-abbd-c89e6ebf1580" className="py-1.5">Global Ventures Cayman Ltd</SelectItem>
                              <SelectItem value="9b151b78-1625-43dc-9d76-c201a39b3b70" className="py-1.5">TechCorp Solutions Inc</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <FormDescription>
                          {defaultValues?.id 
                            ? "Organization assignment is managed externally"
                            : "Select the primary organization for this project. A project organization assignment will be created automatically."
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_primary"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Primary Project</FormLabel>
                          <FormDescription>
                            Set as your primary project (will unset other primary projects)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />


                </div>
              </TabsContent>
              
              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            <div className="sticky top-0 bg-white p-2 border-b z-10">
                              <Input 
                                placeholder="Search currencies..."
                                className="h-8"
                                onChange={(e) => {
                                  const searchField = e.currentTarget;
                                  const options = searchField.closest('div')?.querySelectorAll('[data-currency-option]');
                                  if (options) {
                                    options.forEach(option => {
                                      const text = option.textContent?.toLowerCase() || '';
                                      const matches = text.includes(searchField.value.toLowerCase());
                                      (option as HTMLElement).style.display = matches ? 'block' : 'none';
                                    });
                                  }
                                }}
                              />
                            </div>
                            {currencies.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code} data-currency-option className="py-1.5">
                                <span className="font-medium">{currency.code}</span> - {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the currency for all financial values in this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="target_raise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Raise</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g. 1000000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Target amount to raise for this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_notional"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Notional</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g. 5000000" {...field} />
                        </FormControl>
                        <FormDescription>
                          The notional value of the project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimum_investment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Investment</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g. 10000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minimum investment amount required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimated_yield_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Yield Percentage</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g. 5.25" 
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? parseFloat(value) : '');
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Estimated annual yield percentage
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="token_symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Symbol</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. BTC" {...field} />
                        </FormControl>
                        <FormDescription>
                          Symbol for tokenized projects
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Dates Tab */}
              <TabsContent value="dates" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="subscription_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          When investors can start subscribing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subscription_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          When the subscription period closes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transaction_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          When the investment period begins
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maturity_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maturity Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          When the investment reaches maturity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Duration</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1_month" className="py-1.5">1 Month</SelectItem>
                            <SelectItem value="3_months" className="py-1.5">3 Months</SelectItem>
                            <SelectItem value="6_months" className="py-1.5">6 Months</SelectItem>
                            <SelectItem value="9_months" className="py-1.5">9 Months</SelectItem>
                            <SelectItem value="12_months" className="py-1.5">12 Months</SelectItem>
                            <SelectItem value="over_12_months" className="py-1.5">Over 12 Months</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The expected duration of this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              {/* Legal Tab */}
              <TabsContent value="legal" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="legal_entity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Entity</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Chain Capital Ltd" {...field} />
                        </FormControl>
                        <FormDescription>
                          Legal entity name for this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="jurisdiction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jurisdiction</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select jurisdiction" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="US" className="py-1.5">United States</SelectItem>
                            <SelectItem value="UK" className="py-1.5">United Kingdom</SelectItem>
                            <SelectItem value="SG" className="py-1.5">Singapore</SelectItem>
                            <SelectItem value="CH" className="py-1.5">Switzerland</SelectItem>
                            <SelectItem value="DE" className="py-1.5">Germany</SelectItem>
                            <SelectItem value="HK" className="py-1.5">Hong Kong</SelectItem>
                            <SelectItem value="KY" className="py-1.5">Cayman Islands</SelectItem>
                            <SelectItem value="LU" className="py-1.5">Luxembourg</SelectItem>
                            <SelectItem value="JP" className="py-1.5">Japan</SelectItem>
                            <SelectItem value="AE" className="py-1.5">United Arab Emirates</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Legal jurisdiction for this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 12-3456789" {...field} />
                        </FormControl>
                        <FormDescription>
                          Tax identification number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="regulatory_exemptions"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Regulatory Exemptions</FormLabel>
                        <FormControl>
                          <RegulatoryExemptionsField
                            value={field.value}
                            onChange={field.onChange}
                            disabled={false}
                          />
                        </FormControl>
                        <FormDescription>
                          Select applicable regulatory exemptions for this project based on your target markets and investor base
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              

              
              {/* Documents Tab with simplified categories */}
              {defaultValues?.id && (
                <TabsContent value="documents" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Tabs value={activeDocCategory} onValueChange={setActiveDocCategory} className="w-full">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                        <TabsList className="md:w-auto h-auto flex-wrap">
                          {documentCategories.map(category => (
                            <TabsTrigger 
                              key={category.id} 
                              value={category.id}
                              className="flex items-center gap-1"
                            >
                              {category.icon}
                              <span>{category.label}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                      
                      {documentCategories.map(category => (
                        <TabsContent key={category.id} value={category.id} className="mt-4">
                          <div className="grid grid-cols-1 gap-6">
                            <div className="border-l-4 border-primary/20 pl-3 mb-4">
                              <h3 className="text-base font-medium">{category.label}</h3>
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            </div>
                            {category.types.map(docType => (
                              <Card key={docType} className="overflow-hidden">
                                <CardHeader className="bg-muted/30 pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {getDocumentTypeIcon(docType)}
                                      <CardTitle className="text-base">
                                        {formatDocumentTypeLabel(docType)}
                                      </CardTitle>
                                    </div>
                                    <div>
                                      {getUploadComponent(docType)}
                                    </div>
                                  </div>
                                  <CardDescription className="text-xs mt-1">
                                    {getDocumentTypeDescription(docType)}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <IssuerDocumentList
                                    projectId={defaultValues.id}
                                    key={`${docType}-${defaultValues.id}`}
                                    preFilteredType={docType}
                                    compact={true}
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing || activeTab === "documents"}
              >
                Cancel
              </Button>
              {activeTab !== "documents" && (
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {defaultValues ? "Saving..." : "Creating..."}
                    </>
                  ) : defaultValues ? (
                    "Save changes"
                  ) : (
                    "Create project"
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to get document type descriptions
function getDocumentTypeDescription(type: IssuerDocumentType): string {
  switch (type) {
    case IssuerDocumentType.ISSUER_CREDITWORTHINESS:
      return "Documents related to issuer's credit rating, financial position and reputation";
    case IssuerDocumentType.PROJECT_SECURITY_TYPE:
      return "Details about the type of security being offered";
    case IssuerDocumentType.OFFERING_DETAILS:
      return "Prospectus and detailed information about the offering";
    case IssuerDocumentType.TERM_SHEET:
      return "Term sheet outlining the key terms of the investment";
    case IssuerDocumentType.SPECIAL_RIGHTS:
      return "Documents detailing any special rights or privileges for investors";
    case IssuerDocumentType.UNDERWRITERS:
      return "Information about underwriters or placement agents";
    case IssuerDocumentType.USE_OF_PROCEEDS:
      return "Documentation on how the raised funds will be used";
    case IssuerDocumentType.FINANCIAL_HIGHLIGHTS:
      return "Key financial information and projections";
    case IssuerDocumentType.TIMING:
      return "Timeline details for the offering and important dates";
    case IssuerDocumentType.RISK_FACTORS:
      return "Information about potential risks associated with the investment";
    case IssuerDocumentType.LEGAL_REGULATORY_COMPLIANCE:
      return "Documents pertaining to legal and regulatory compliance agreements and requirements";
    default:
      return "Project documentation";
  }
}

export default ProjectDialog;
