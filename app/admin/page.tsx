'use client'

import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Mock data for demonstration
const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com', status: 'active', quizzesTaken: 15, averageScore: 85 },
  { id: '2', name: 'Bob', email: 'bob@example.com', status: 'inactive', quizzesTaken: 8, averageScore: 72 },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', status: 'active', quizzesTaken: 20, averageScore: 90 },
]

const mockFiles = [
  { id: '1', name: 'document1.pdf', uploadedBy: 'Alice', size: '2.5MB', uploadDate: '2023-03-15' },
  { id: '2', name: 'document2.docx', uploadedBy: 'Bob', size: '1.8MB', uploadDate: '2023-03-16' },
  { id: '3', name: 'document3.txt', uploadedBy: 'Charlie', size: '0.5MB', uploadDate: '2023-03-17' },
]

const mockAnalytics = [
  { name: 'Jan', users: 40, quizzes: 80, averageScore: 75 },
  { name: 'Feb', users: 55, quizzes: 120, averageScore: 78 },
  { name: 'Mar', users: 70, quizzes: 180, averageScore: 82 },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('users')

  useEffect(() => {
    if (!user || user.id !== '1') { // Assuming user with id '1' is admin
      router.push('/login')
    }
  }, [user, router])

  const downloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.text("Analytics Report", 14, 15)
    
    // Add user table
    autoTable(doc, {
      head: [['Name', 'Email', 'Status', 'Quizzes Taken', 'Average Score']],
      body: mockUsers.map(user => [user.name, user.email, user.status, user.quizzesTaken, user.averageScore]),
      startY: 25
    })

    // Get final Y position
    const finalY = (doc as any).lastAutoTable.finalY

    // Add file table
    autoTable(doc, {
      head: [['File Name', 'Uploaded By', 'Size', 'Upload Date']],
      body: mockFiles.map(file => [file.name, file.uploadedBy, file.size, file.uploadDate]),
      startY: finalY + 10
    })

    // Get final Y position for analytics table
    const finalY2 = (doc as any).lastAutoTable.finalY

    // Add analytics data
    autoTable(doc, {
      head: [['Month', 'Users', 'Quizzes', 'Average Score']],
      body: mockAnalytics.map(data => [data.name, data.users, data.quizzes, data.averageScore]),
      startY: finalY2 + 10
    })

    doc.save("analytics_report.pdf")
  }

  if (!user || user.id !== '1') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="mb-6">
        <Button onClick={() => setActiveTab('users')} variant={activeTab === 'users' ? 'default' : 'outline'} className="mr-2">Users</Button>
        <Button onClick={() => setActiveTab('files')} variant={activeTab === 'files' ? 'default' : 'outline'} className="mr-2">Files</Button>
        <Button onClick={() => setActiveTab('analytics')} variant={activeTab === 'analytics' ? 'default' : 'outline'}>Analytics</Button>
      </div>
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quizzes Taken</TableHead>
                  <TableHead>Average Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>{user.quizzesTaken}</TableCell>
                    <TableCell>{user.averageScore}%</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm">Ban</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {activeTab === 'files' && (
        <Card>
          <CardHeader>
            <CardTitle>File Management</CardTitle>
            <CardDescription>View and manage uploaded files</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{file.uploadedBy}</TableCell>
                    <TableCell>{file.size}</TableCell>
                    <TableCell>{file.uploadDate}</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm">Delete</Button>
                </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {activeTab === 'analytics' && (
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>View platform usage and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="users" fill="#8884d8" />
                  <Bar yAxisId="left" dataKey="quizzes" fill="#82ca9d" />
                  <Bar yAxisId="right" dataKey="averageScore" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Button onClick={downloadPDF}>Download Analytics PDF</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

