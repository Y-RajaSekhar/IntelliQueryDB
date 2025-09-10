import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: number;
  name: string;
  age: number;
  gpa: number;
  major: string;
  hoursStudied: number;
}

export const DatabaseManager = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: "Alice Johnson", age: 20, gpa: 3.8, major: "Computer Science", hoursStudied: 25 },
    { id: 2, name: "Bob Smith", age: 22, gpa: 3.2, major: "Mathematics", hoursStudied: 20 },
    { id: 3, name: "Carol Davis", age: 19, gpa: 3.9, major: "Physics", hoursStudied: 30 },
    { id: 4, name: "David Wilson", age: 21, gpa: 3.5, major: "Computer Science", hoursStudied: 22 },
    { id: 5, name: "Eve Brown", age: 23, gpa: 3.7, major: "Chemistry", hoursStudied: 28 },
  ]);

  const [newStudent, setNewStudent] = useState({
    name: "",
    age: "",
    gpa: "",
    major: "",
    hoursStudied: "",
  });

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.age || !newStudent.gpa || !newStudent.major || !newStudent.hoursStudied) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const student: Student = {
      id: Math.max(...students.map(s => s.id)) + 1,
      name: newStudent.name,
      age: parseInt(newStudent.age),
      gpa: parseFloat(newStudent.gpa),
      major: newStudent.major,
      hoursStudied: parseInt(newStudent.hoursStudied),
    };

    setStudents([...students, student]);
    setNewStudent({ name: "", age: "", gpa: "", major: "", hoursStudied: "" });
    
    toast({
      title: "Success",
      description: "Student record added successfully",
    });
  };

  const handleDeleteStudent = (id: number) => {
    setStudents(students.filter(s => s.id !== id));
    toast({
      title: "Success",
      description: "Student record deleted",
    });
  };

  const getGPABadgeVariant = (gpa: number) => {
    if (gpa >= 3.7) return "default";
    if (gpa >= 3.0) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur terminal-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{students.length}</div>
            <p className="text-sm text-muted-foreground">Active student records</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Average GPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neon-blue">
              {(students.reduce((sum, s) => sum + s.gpa, 0) / students.length).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neon-purple">2.4 KB</div>
            <p className="text-sm text-muted-foreground">JSON-based storage</p>
          </CardContent>
        </Card>
      </div>

      {/* Add New Record */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add New Student</span>
          </CardTitle>
          <CardDescription>Insert a new record into the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="Student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={newStudent.age}
                onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                placeholder="Age"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                type="number"
                step="0.1"
                value={newStudent.gpa}
                onChange={(e) => setNewStudent({ ...newStudent, gpa: e.target.value })}
                placeholder="GPA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                value={newStudent.major}
                onChange={(e) => setNewStudent({ ...newStudent, major: e.target.value })}
                placeholder="Major"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours Studied</Label>
              <Input
                id="hours"
                type="number"
                value={newStudent.hoursStudied}
                onChange={(e) => setNewStudent({ ...newStudent, hoursStudied: e.target.value })}
                placeholder="Weekly hours"
              />
            </div>
          </div>
          <Button onClick={handleAddStudent} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Records</CardTitle>
              <CardDescription>Database contents with CRUD operations</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-terminal-border bg-terminal-bg/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>GPA</TableHead>
                  <TableHead>Major</TableHead>
                  <TableHead>Hours/Week</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono">{student.id}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.age}</TableCell>
                    <TableCell>
                      <Badge variant={getGPABadgeVariant(student.gpa) as any}>
                        {student.gpa.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.major}</TableCell>
                    <TableCell>{student.hoursStudied}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};