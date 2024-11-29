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

interface User {
  id: string
  name: string
  email: string
  status: string
  quizzesTaken: number
  averageScore: number
}

interface File {
  id: string
  name: string
  uploadedBy: string
  userEmail: string
  size: number
  type: string
  uploadDate: string
  status: string
  moderationStatus: string
}

interface Analytics {
  name: string
  users: number
  quizzes: number
  averageScore: number
  responses: number
}

interface OverallStats {
  totalUsers: number
  totalQuizzes: number
  totalFiles: number
  averageScore: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [overall, setOverall] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'admin') {
        setLoading(false)
        return
      }

      try {
        const [usersRes, filesRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/users', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }),
          fetch('/api/admin/files', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }),
          fetch('/api/admin/analytics', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          })
        ])

        if (!usersRes.ok || !filesRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const usersData = await usersRes.json()
        const filesData = await filesRes.json()
        const analyticsData = await analyticsRes.json()

        setUsers(usersData.users)
        setFiles(filesData.files)
        setAnalytics(analyticsData.analytics)
        setOverall(analyticsData.overall)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
    }
  }, [user, router])

  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'delete') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (!res.ok) {
        throw new Error('Failed to update user')
      }

      // Refresh user list
      const usersRes = await fetch('/api/admin/users')
      const usersData = await usersRes.json()
      setUsers(usersData.users)
    } catch (error) {
      console.error('Failed to perform user action:', error)
    }
  }

  const handleFileAction = async (fileId: string, action: 'delete' | 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/files', {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, action })
      })

      if (!res.ok) {
        throw new Error('Failed to update file')
      }

      // Refresh file list
      const filesRes = await fetch('/api/admin/files')
      const filesData = await filesRes.json()
      setFiles(filesData.files)
    } catch (error) {
      console.error('Failed to perform file action:', error)
    }
  }

  const downloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.text("Analytics Report", 14, 15)
    
    // Add overall stats
    if (overall) {
      doc.text("Overall Statistics", 14, 25)
      autoTable(doc, {
        head: [['Total Users', 'Total Quizzes', 'Total Files', 'Average Score']],
        body: [[
          overall.totalUsers,
          overall.totalQuizzes,
          overall.totalFiles,
          `${overall.averageScore}%`
        ]],
        startY: 30
      })
    }

    // Get final Y position
    const finalY = (doc as any).lastAutoTable.finalY

    // Add user table
    autoTable(doc, {
      head: [['Name', 'Email', 'Status', 'Quizzes Taken', 'Average Score']],
      body: users.map(user => [
        user.name,
        user.email,
        user.status,
        user.quizzesTaken,
        `${user.averageScore}%`
      ]),
      startY: finalY + 10
    })

    // Get final Y position
    const finalY2 = (doc as any).lastAutoTable.finalY

    // Add file table
    autoTable(doc, {
      head: [['File Name', 'Uploaded By', 'Size', 'Upload Date', 'Status']],
      body: files.map(file => [
        file.name,
        file.uploadedBy,
        `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        new Date(file.uploadDate).toLocaleDateString(),
        file.moderationStatus
      ]),
      startY: finalY2 + 10
    })

    // Get final Y position for analytics table
    const finalY3 = (doc as any).lastAutoTable.finalY

    // Add analytics data
    autoTable(doc, {
      head: [['Month', 'Users', 'Quizzes', 'Responses', 'Average Score']],
      body: analytics.map(data => [
        data.name,
        data.users,
        data.quizzes,
        data.responses,
        `${data.averageScore}%`
      ]),
      startY: finalY3 + 10
    })

    doc.save("analytics_report.pdf")
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
        <h1 className="text-3xl font-bold mb-6">Loading...</h1>
      </div>
    )
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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>{user.quizzesTaken}</TableCell>
                    <TableCell>{user.averageScore}%</TableCell>
                    <TableCell className="space-x-2">
                      {user.status === 'active' ? (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleUserAction(user.id, 'ban')}
                        >
                          Ban
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUserAction(user.id, 'unban')}
                        >
                          Unban
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleUserAction(user.id, 'delete')}
                      >
                        Delete
                      </Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{file.uploadedBy}</TableCell>
                    <TableCell>{(file.size / 1024 / 1024).toFixed(2)}MB</TableCell>
                    <TableCell>{new Date(file.uploadDate).toLocaleDateString()}</TableCell>
                    <TableCell>{file.moderationStatus}</TableCell>
                    <TableCell className="space-x-2">
                      {file.moderationStatus === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFileAction(file.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleFileAction(file.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleFileAction(file.id, 'delete')}
                      >
                        Delete
                      </Button>
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
            {overall && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Users</CardTitle>
                    <CardDescription>{overall.totalUsers}</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Quizzes</CardTitle>
                    <CardDescription>{overall.totalQuizzes}</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Files</CardTitle>
                    <CardDescription>{overall.totalFiles}</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Average Score</CardTitle>
                    <CardDescription>{overall.averageScore}%</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
            <div className="h-[400px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="users" fill="#8884d8" name="New Users" />
                  <Bar yAxisId="left" dataKey="quizzes" fill="#82ca9d" name="New Quizzes" />
                  <Bar yAxisId="left" dataKey="responses" fill="#ffc658" name="Quiz Responses" />
                  <Bar yAxisId="right" dataKey="averageScore" fill="#ff8042" name="Average Score" />
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
