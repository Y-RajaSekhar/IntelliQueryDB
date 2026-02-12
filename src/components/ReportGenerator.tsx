 import { useState, useMemo, useRef } from "react";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Textarea } from "@/components/ui/textarea";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Badge } from "@/components/ui/badge";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Separator } from "@/components/ui/separator";
 import {
   FileText,
   Download,
   Printer,
   BarChart3,
   Table,
   Brain,
   Calendar,
   FileSpreadsheet,
   Eye,
   Settings,
   CheckCircle,
   TrendingUp,
   TrendingDown,
   Activity,
 } from "lucide-react";
 import { useDataStore, DataRecord } from "@/hooks/useDataStore";
 import { toast } from "sonner";
 import { format } from "date-fns";
 
 interface ReportSection {
   id: string;
   label: string;
   icon: React.ReactNode;
   enabled: boolean;
 }
 
 interface MLInsights {
   modelType: string;
   formula?: string;
   correlation?: number;
   rSquared?: number;
   prediction?: string;
   insights: string[];
   outlierCount?: number;
   uniqueCategories?: number;
   entropy?: string;
   topCategory?: string;
   topGroup?: string;
   groupCount?: number;
   avgVariability?: string;
 }
 
 interface ReportGeneratorProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedAnalysis: string;
   mlInsights: MLInsights | null;
   numericFields: string[];
   categoricalFields: string[];
 }
 
 type ReportTemplate = "executive" | "detailed" | "data-only";
 
 export const ReportGenerator = ({
   open,
   onOpenChange,
   selectedAnalysis,
   mlInsights,
   numericFields,
   categoricalFields,
 }: ReportGeneratorProps) => {
   const { records, schema, recordType } = useDataStore();
   const [reportTitle, setReportTitle] = useState("Data Analysis Report");
   const [reportDescription, setReportDescription] = useState("");
   const [template, setTemplate] = useState<ReportTemplate>("executive");
   const [activeTab, setActiveTab] = useState("configure");
   const reportRef = useRef<HTMLDivElement>(null);
 
   const [sections, setSections] = useState<ReportSection[]>([
     { id: "summary", label: "Executive Summary", icon: <FileText className="h-4 w-4" />, enabled: true },
     { id: "statistics", label: "Key Statistics", icon: <Activity className="h-4 w-4" />, enabled: true },
     { id: "charts", label: "Visualizations", icon: <BarChart3 className="h-4 w-4" />, enabled: true },
     { id: "insights", label: "ML Insights", icon: <Brain className="h-4 w-4" />, enabled: true },
     { id: "data-table", label: "Data Preview", icon: <Table className="h-4 w-4" />, enabled: true },
     { id: "recommendations", label: "Recommendations", icon: <CheckCircle className="h-4 w-4" />, enabled: true },
   ]);
 
   // Calculate statistics
   const statistics = useMemo(() => {
     if (!records.length) return null;
 
     const stats: Record<string, { min: number; max: number; avg: number; sum: number; count: number }> = {};
 
     numericFields.forEach((field) => {
       const values = records
         .map((r) => Number(r.data[field]))
         .filter((v) => !isNaN(v));
 
       if (values.length > 0) {
         stats[field] = {
           min: Math.min(...values),
           max: Math.max(...values),
           avg: values.reduce((a, b) => a + b, 0) / values.length,
           sum: values.reduce((a, b) => a + b, 0),
           count: values.length,
         };
       }
     });
 
     const categoryBreakdown: Record<string, Record<string, number>> = {};
     categoricalFields.forEach((field) => {
       categoryBreakdown[field] = records.reduce((acc, r) => {
         const val = String(r.data[field] || "Unknown");
         acc[val] = (acc[val] || 0) + 1;
         return acc;
       }, {} as Record<string, number>);
     });
 
     return { numericStats: stats, categoryBreakdown };
   }, [records, numericFields, categoricalFields]);
 
   // Generate recommendations based on data
   const recommendations = useMemo(() => {
     const recs: string[] = [];
 
     if (mlInsights) {
       if ("rSquared" in mlInsights && mlInsights.rSquared !== undefined) {
         if (mlInsights.rSquared > 0.7) {
           recs.push("Strong correlation detected - consider using this relationship for predictive modeling");
         } else if (mlInsights.rSquared < 0.3) {
           recs.push("Weak correlation - explore other variables or non-linear relationships");
         }
       }
 
       if ("outlierCount" in mlInsights && mlInsights.outlierCount && mlInsights.outlierCount > 0) {
         recs.push(`Investigate ${mlInsights.outlierCount} outliers - they may indicate data quality issues or special cases`);
       }
 
       if ("entropy" in mlInsights) {
         const entropy = parseFloat(mlInsights.entropy || "0");
         if (entropy < 1) {
           recs.push("Low data diversity - consider if the sample is representative");
         }
       }
     }
 
     if (statistics) {
       Object.entries(statistics.numericStats).forEach(([field, stat]) => {
         const range = stat.max - stat.min;
         if (range === 0) {
           recs.push(`Field "${field}" has no variance - all values are identical`);
         }
       });
     }
 
     if (records.length < 30) {
       recs.push("Small sample size - statistical conclusions may not be reliable");
     }
 
     if (recs.length === 0) {
       recs.push("Data quality appears good - continue with regular monitoring");
       recs.push("Consider A/B testing to validate insights before major decisions");
     }
 
     return recs;
   }, [mlInsights, statistics, records.length]);
 
   const toggleSection = (sectionId: string) => {
     setSections((prev) =>
       prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
     );
   };
 
   const applyTemplate = (templateType: ReportTemplate) => {
     setTemplate(templateType);
     switch (templateType) {
       case "executive":
         setSections((prev) =>
           prev.map((s) => ({
             ...s,
             enabled: ["summary", "statistics", "insights", "recommendations"].includes(s.id),
           }))
         );
         break;
       case "detailed":
         setSections((prev) => prev.map((s) => ({ ...s, enabled: true })));
         break;
       case "data-only":
         setSections((prev) =>
           prev.map((s) => ({
             ...s,
             enabled: ["statistics", "data-table"].includes(s.id),
           }))
         );
         break;
     }
   };
 
   const generateCSV = () => {
     if (!records.length) return;
 
     const headers = schema.join(",");
     const rows = records.map((r) =>
       schema.map((field) => {
         const val = r.data[field];
         if (typeof val === "string" && val.includes(",")) {
           return `"${val}"`;
         }
         return val ?? "";
       }).join(",")
     );
 
     const csv = [headers, ...rows].join("\n");
     const blob = new Blob([csv], { type: "text/csv" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `${reportTitle.replace(/\s+/g, "_")}_data_${format(new Date(), "yyyy-MM-dd")}.csv`;
     a.click();
     URL.revokeObjectURL(url);
     toast.success("CSV exported successfully");
   };
 
   const generateHTMLReport = () => {
     const enabledSections = sections.filter((s) => s.enabled);
     const reportDate = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
 
     let html = `
 <!DOCTYPE html>
 <html lang="en">
 <head>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>${reportTitle}</title>
   <style>
     * { margin: 0; padding: 0; box-sizing: border-box; }
     body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; background: #fff; }
     .container { max-width: 900px; margin: 0 auto; padding: 40px; }
     .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
     .header h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
     .header .meta { color: #64748b; font-size: 14px; }
     .section { margin-bottom: 30px; page-break-inside: avoid; }
     .section h2 { font-size: 20px; color: #6366f1; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
     .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
     .stat-card { background: #f8fafc; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0; }
     .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
     .stat-card .value { font-size: 24px; font-weight: 600; color: #1a1a2e; }
     .stat-card .sublabel { font-size: 11px; color: #94a3b8; }
     .insight-box { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
     .insight-box h3 { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
     .insight-box .model { font-size: 18px; font-weight: 600; }
     .insight-list { list-style: none; }
     .insight-list li { padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; gap: 10px; }
     .insight-list li:last-child { border-bottom: none; }
     .insight-list .dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; flex-shrink: 0; margin-top: 6px; }
     table { width: 100%; border-collapse: collapse; font-size: 13px; }
     th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
     th { background: #f8fafc; font-weight: 600; color: #475569; }
     tr:hover { background: #f8fafc; }
     .rec-item { background: #ecfdf5; border-left: 3px solid #10b981; padding: 12px 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
     .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
     @media print { .container { padding: 20px; } }
   </style>
 </head>
 <body>
   <div class="container">
     <div class="header">
       <h1>${reportTitle}</h1>
       <div class="meta">
         Generated on ${reportDate} • ${records.length} records analyzed • Data type: ${recordType}
         ${reportDescription ? `<br/>${reportDescription}` : ""}
       </div>
     </div>
 `;
 
     // Executive Summary
     if (enabledSections.some((s) => s.id === "summary")) {
       html += `
     <div class="section">
       <h2>📊 Executive Summary</h2>
       <p>This report analyzes <strong>${records.length}</strong> records of type <strong>${recordType}</strong>. 
       The dataset contains <strong>${numericFields.length}</strong> numeric fields and <strong>${categoricalFields.length}</strong> categorical fields available for analysis.</p>
       ${mlInsights ? `<p style="margin-top: 10px;">Current analysis: <strong>${mlInsights.modelType}</strong> ${selectedAnalysis ? `on ${selectedAnalysis.split("-").slice(1).join(" vs ")}` : ""}</p>` : ""}
     </div>
 `;
     }
 
     // Statistics
     if (enabledSections.some((s) => s.id === "statistics") && statistics) {
       html += `
     <div class="section">
       <h2>📈 Key Statistics</h2>
       <div class="stat-grid">
         <div class="stat-card">
           <div class="label">Total Records</div>
           <div class="value">${records.length.toLocaleString()}</div>
           <div class="sublabel">Data points analyzed</div>
         </div>
         <div class="stat-card">
           <div class="label">Numeric Fields</div>
           <div class="value">${numericFields.length}</div>
           <div class="sublabel">${numericFields.slice(0, 3).join(", ")}${numericFields.length > 3 ? "..." : ""}</div>
         </div>
         <div class="stat-card">
           <div class="label">Categories</div>
           <div class="value">${categoricalFields.length}</div>
           <div class="sublabel">${categoricalFields.slice(0, 3).join(", ")}${categoricalFields.length > 3 ? "..." : ""}</div>
         </div>
 `;
 
       // Add numeric field stats
       Object.entries(statistics.numericStats).slice(0, 3).forEach(([field, stat]) => {
         html += `
         <div class="stat-card">
           <div class="label">Avg ${field}</div>
           <div class="value">${stat.avg.toFixed(2)}</div>
           <div class="sublabel">Range: ${stat.min.toFixed(1)} - ${stat.max.toFixed(1)}</div>
         </div>
 `;
       });
 
       html += `
       </div>
     </div>
 `;
     }
 
     // ML Insights
     if (enabledSections.some((s) => s.id === "insights") && mlInsights) {
       html += `
     <div class="section">
       <h2>🧠 Machine Learning Insights</h2>
       <div class="insight-box">
         <h3>Model Type</h3>
         <div class="model">${mlInsights.modelType}</div>
         ${"formula" in mlInsights && mlInsights.formula ? `<div style="margin-top: 10px; font-family: monospace; font-size: 13px; opacity: 0.9;">${mlInsights.formula}</div>` : ""}
       </div>
 `;
 
       if ("correlation" in mlInsights && mlInsights.correlation !== undefined) {
         html += `
       <div class="stat-grid" style="margin-bottom: 20px;">
         <div class="stat-card">
           <div class="label">Correlation</div>
           <div class="value">${mlInsights.correlation.toFixed(3)}</div>
           <div class="sublabel">${Math.abs(mlInsights.correlation) > 0.7 ? "Strong" : Math.abs(mlInsights.correlation) > 0.4 ? "Moderate" : "Weak"}</div>
         </div>
         <div class="stat-card">
           <div class="label">R² Score</div>
           <div class="value">${mlInsights.rSquared?.toFixed(3) || "N/A"}</div>
           <div class="sublabel">Variance explained</div>
         </div>
         ${mlInsights.outlierCount ? `
         <div class="stat-card">
           <div class="label">Outliers</div>
           <div class="value">${mlInsights.outlierCount}</div>
           <div class="sublabel">Anomalies detected</div>
         </div>
         ` : ""}
       </div>
 `;
       }
 
       if (mlInsights.insights.length > 0) {
         html += `
       <ul class="insight-list">
         ${mlInsights.insights.map((i) => `<li><span class="dot"></span>${i}</li>`).join("")}
       </ul>
 `;
       }
 
       html += `</div>`;
     }
 
     // Data Table Preview
     if (enabledSections.some((s) => s.id === "data-table") && records.length > 0) {
       const previewRecords = records.slice(0, 10);
       const displayFields = schema.slice(0, 6);
 
       html += `
     <div class="section">
       <h2>📋 Data Preview</h2>
       <p style="color: #64748b; margin-bottom: 15px; font-size: 14px;">Showing first ${previewRecords.length} of ${records.length} records</p>
       <table>
         <thead>
           <tr>
             ${displayFields.map((f) => `<th>${f}</th>`).join("")}
             ${schema.length > 6 ? `<th>...</th>` : ""}
           </tr>
         </thead>
         <tbody>
           ${previewRecords.map((r) => `
             <tr>
               ${displayFields.map((f) => `<td>${r.data[f] ?? "-"}</td>`).join("")}
               ${schema.length > 6 ? `<td>...</td>` : ""}
             </tr>
           `).join("")}
         </tbody>
       </table>
     </div>
 `;
     }
 
     // Recommendations
     if (enabledSections.some((s) => s.id === "recommendations") && recommendations.length > 0) {
       html += `
     <div class="section">
       <h2>✅ Recommendations</h2>
       ${recommendations.map((r) => `<div class="rec-item">${r}</div>`).join("")}
     </div>
 `;
     }
 
     html += `
     <div class="footer">
       Generated by IntelliQueryDB • AI-Powered Database Analytics System
     </div>
   </div>
 </body>
 </html>
 `;
 
     return html;
   };
 
   const downloadReport = () => {
     const html = generateHTMLReport();
     const blob = new Blob([html], { type: "text/html" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `${reportTitle.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.html`;
     a.click();
     URL.revokeObjectURL(url);
     toast.success("Report downloaded successfully");
   };
 
   const printReport = () => {
     const html = generateHTMLReport();
     const printWindow = window.open("", "_blank");
     if (printWindow) {
       printWindow.document.write(html);
       printWindow.document.close();
       printWindow.onload = () => {
         printWindow.print();
       };
     }
     toast.success("Print dialog opened");
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5 text-primary" />
             Report Generator
           </DialogTitle>
           <DialogDescription>
             Create customized reports from your data analysis
           </DialogDescription>
         </DialogHeader>
 
         <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
           <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="configure" className="flex items-center gap-2">
               <Settings className="h-4 w-4" />
               Configure
             </TabsTrigger>
             <TabsTrigger value="preview" className="flex items-center gap-2">
               <Eye className="h-4 w-4" />
               Preview
             </TabsTrigger>
             <TabsTrigger value="export" className="flex items-center gap-2">
               <Download className="h-4 w-4" />
               Export
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="configure" className="flex-1 overflow-auto mt-4 space-y-4">
             <div className="grid gap-4">
               <div className="space-y-2">
                 <Label htmlFor="title">Report Title</Label>
                 <Input
                   id="title"
                   value={reportTitle}
                   onChange={(e) => setReportTitle(e.target.value)}
                   placeholder="Enter report title"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="description">Description (Optional)</Label>
                 <Textarea
                   id="description"
                   value={reportDescription}
                   onChange={(e) => setReportDescription(e.target.value)}
                   placeholder="Add a brief description of this report..."
                   rows={2}
                 />
               </div>
 
               <div className="space-y-2">
                 <Label>Template</Label>
                 <Select value={template} onValueChange={(v) => applyTemplate(v as ReportTemplate)}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="executive">
                       <div className="flex items-center gap-2">
                         <TrendingUp className="h-4 w-4" />
                         Executive Summary
                       </div>
                     </SelectItem>
                     <SelectItem value="detailed">
                       <div className="flex items-center gap-2">
                         <FileText className="h-4 w-4" />
                         Detailed Analysis
                       </div>
                     </SelectItem>
                     <SelectItem value="data-only">
                       <div className="flex items-center gap-2">
                         <Table className="h-4 w-4" />
                         Data Export Only
                       </div>
                     </SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               <Separator />
 
               <div className="space-y-2">
                 <Label>Report Sections</Label>
                 <div className="grid grid-cols-2 gap-3">
                   {sections.map((section) => (
                     <div
                       key={section.id}
                       className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                         section.enabled
                           ? "bg-primary/5 border-primary/20"
                           : "bg-muted/30 border-border"
                       }`}
                       onClick={() => toggleSection(section.id)}
                     >
                       <Checkbox
                         checked={section.enabled}
                         onCheckedChange={() => toggleSection(section.id)}
                       />
                       <div className="flex items-center gap-2">
                         {section.icon}
                         <span className="text-sm">{section.label}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </TabsContent>
 
           <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
             <ScrollArea className="h-[400px] rounded-lg border p-4 bg-white">
               <div ref={reportRef} className="space-y-6">
                 {/* Report Header */}
                 <div className="border-b-2 border-primary pb-4">
                   <h1 className="text-2xl font-bold text-foreground">{reportTitle}</h1>
                   <p className="text-sm text-muted-foreground mt-1">
                     Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")} • {records.length} records
                   </p>
                   {reportDescription && (
                     <p className="text-sm mt-2">{reportDescription}</p>
                   )}
                 </div>
 
                 {/* Summary Section */}
                 {sections.find((s) => s.id === "summary")?.enabled && (
                   <div>
                     <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                       <FileText className="h-4 w-4 text-primary" />
                       Executive Summary
                     </h2>
                     <p className="text-sm text-muted-foreground">
                       This report analyzes <strong>{records.length}</strong> records of type{" "}
                       <strong>{recordType}</strong>. The dataset contains{" "}
                       <strong>{numericFields.length}</strong> numeric fields and{" "}
                       <strong>{categoricalFields.length}</strong> categorical fields.
                     </p>
                   </div>
                 )}
 
                 {/* Statistics Section */}
                 {sections.find((s) => s.id === "statistics")?.enabled && statistics && (
                   <div>
                     <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                       <Activity className="h-4 w-4 text-primary" />
                       Key Statistics
                     </h2>
                     <div className="grid grid-cols-3 gap-3">
                       <Card className="bg-muted/20">
                         <CardContent className="p-3">
                           <p className="text-xs text-muted-foreground">Total Records</p>
                           <p className="text-xl font-bold">{records.length}</p>
                         </CardContent>
                       </Card>
                       {Object.entries(statistics.numericStats).slice(0, 2).map(([field, stat]) => (
                         <Card key={field} className="bg-muted/20">
                           <CardContent className="p-3">
                             <p className="text-xs text-muted-foreground">Avg {field}</p>
                             <p className="text-xl font-bold">{stat.avg.toFixed(2)}</p>
                           </CardContent>
                         </Card>
                       ))}
                     </div>
                   </div>
                 )}
 
                 {/* ML Insights Section */}
                 {sections.find((s) => s.id === "insights")?.enabled && mlInsights && (
                   <div>
                     <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                       <Brain className="h-4 w-4 text-primary" />
                       ML Analysis: {mlInsights.modelType}
                     </h2>
                     <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
                       {"formula" in mlInsights && mlInsights.formula && (
                         <p className="font-mono text-sm mb-2">{mlInsights.formula}</p>
                       )}
                       <ul className="text-sm space-y-1">
                         {mlInsights.insights.map((insight, i) => (
                           <li key={i} className="flex items-start gap-2">
                             <span className="text-primary">•</span>
                             {insight}
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>
                 )}
 
                 {/* Data Preview Section */}
                 {sections.find((s) => s.id === "data-table")?.enabled && (
                   <div>
                     <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                       <Table className="h-4 w-4 text-primary" />
                       Data Preview
                     </h2>
                     <div className="border rounded-lg overflow-hidden">
                       <table className="w-full text-sm">
                         <thead className="bg-muted">
                           <tr>
                             {schema.slice(0, 4).map((field) => (
                               <th key={field} className="px-3 py-2 text-left font-medium">
                                 {field}
                               </th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {records.slice(0, 5).map((r, i) => (
                             <tr key={i} className="border-t">
                               {schema.slice(0, 4).map((field) => (
                                 <td key={field} className="px-3 py-2">
                                   {String(r.data[field] ?? "-")}
                                 </td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <p className="text-xs text-muted-foreground p-2 bg-muted/50">
                         Showing 5 of {records.length} records
                       </p>
                     </div>
                   </div>
                 )}
 
                 {/* Recommendations Section */}
                 {sections.find((s) => s.id === "recommendations")?.enabled && (
                   <div>
                     <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                       <CheckCircle className="h-4 w-4 text-primary" />
                       Recommendations
                     </h2>
                     <div className="space-y-2">
                       {recommendations.map((rec, i) => (
                         <div
                           key={i}
                          className="bg-accent/50 dark:bg-accent/20 border-l-2 border-primary px-3 py-2 rounded-r text-sm"
                         >
                           {rec}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             </ScrollArea>
           </TabsContent>
 
           <TabsContent value="export" className="flex-1 overflow-auto mt-4">
             <div className="grid gap-4">
               <Card className="hover:shadow-md transition-shadow cursor-pointer border-border" onClick={downloadReport}>
                 <CardContent className="flex items-center gap-4 p-4">
                   <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                     <FileText className="h-6 w-6 text-primary" />
                   </div>
                   <div className="flex-1">
                     <h3 className="font-semibold">Download HTML Report</h3>
                     <p className="text-sm text-muted-foreground">
                       Formatted report with charts and insights, viewable in any browser
                     </p>
                   </div>
                   <Download className="h-5 w-5 text-muted-foreground" />
                 </CardContent>
               </Card>
 
               <Card className="hover:shadow-md transition-shadow cursor-pointer border-border" onClick={generateCSV}>
                 <CardContent className="flex items-center gap-4 p-4">
                   <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
                     <FileSpreadsheet className="h-6 w-6 text-primary" />
                   </div>
                   <div className="flex-1">
                     <h3 className="font-semibold">Export Data as CSV</h3>
                     <p className="text-sm text-muted-foreground">
                       Raw data export for use in Excel, Google Sheets, or other tools
                     </p>
                   </div>
                   <Download className="h-5 w-5 text-muted-foreground" />
                 </CardContent>
               </Card>
 
               <Card className="hover:shadow-md transition-shadow cursor-pointer border-border" onClick={printReport}>
                 <CardContent className="flex items-center gap-4 p-4">
                   <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
                     <Printer className="h-6 w-6 text-primary" />
                   </div>
                   <div className="flex-1">
                     <h3 className="font-semibold">Print Report</h3>
                     <p className="text-sm text-muted-foreground">
                       Open print dialog for physical copy or save as PDF
                     </p>
                   </div>
                   <Printer className="h-5 w-5 text-muted-foreground" />
                 </CardContent>
               </Card>
 
               <Separator />
 
               <div className="flex items-center justify-between text-sm text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" />
                   Report includes {sections.filter((s) => s.enabled).length} sections
                 </div>
                 <Badge variant="outline">
                   {records.length} records • {schema.length} fields
                 </Badge>
               </div>
             </div>
           </TabsContent>
         </Tabs>
       </DialogContent>
     </Dialog>
   );
 };