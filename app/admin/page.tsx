'use client'

import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { jsPDF } from 'jspdf'
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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    fetchData()
  }, [user, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch analytics data
      const analyticsRes = await fetch('/api/admin/analytics')
      if (!analyticsRes.ok) {
        throw new Error(`Analytics fetch failed: ${analyticsRes.status}`)
      }
      const analyticsData = await analyticsRes.json()
      setAnalytics(analyticsData.analytics)
      setOverall(analyticsData.overall)

      // Fetch users and files data
      const [usersRes, filesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/files')
      ])

      const [usersData, filesData] = await Promise.all([
        usersRes.json(),
        filesRes.json()
      ])

      setUsers(usersData.users)
      setFiles(filesData.files)
      setError('')
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

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
        new Date(file.uploadDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
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

  const formattedAnalytics = analytics.map(item => ({
    name: item.name, // Month name
    users: Number(item.users),
    quizzes: Number(item.quizzes), 
    responses: Number(item.responses),
    averageScore: Number(item.averageScore)
  }))

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
          <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
          
          <div className="mb-6">
            <Button 
              onClick={() => setActiveTab('users')} 
              variant={activeTab === 'users' ? 'default' : 'outline'} 
              className="mr-2"
            >
              Users
            </Button>
            <Button 
              onClick={() => setActiveTab('files')} 
              variant={activeTab === 'files' ? 'default' : 'outline'} 
              className="mr-2"
            >
              Files
            </Button>
            <Button 
              onClick={() => setActiveTab('analytics')} 
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
            >
              Analytics
            </Button>
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
                        <TableCell>
                          {new Date(file.uploadDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
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
                {loading ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
                  </div>
                ) : analytics && analytics.length > 0 ? (
                  <>
                    {overall && (
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{overall.totalUsers}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{overall.totalQuizzes}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{overall.totalFiles}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{overall.averageScore}%</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    <div className="h-[400px] w-full mb-6">
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

                    <div className="mt-4">
                      <Button onClick={downloadPDF}>Download Analytics PDF</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">No analytics data available</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
