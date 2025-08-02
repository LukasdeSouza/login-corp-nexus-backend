import { useState } from "react"
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Employee {
  id: string
  name: string
  email: string
  department: string
  position: string
  salary: number
  startDate: string
  status: 'active' | 'inactive' | 'vacation'
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao.silva@login.com.br',
    department: 'Tecnologia',
    position: 'Desenvolvedor Senior',
    salary: 8500,
    startDate: '2022-03-15',
    status: 'active'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@login.com.br',
    department: 'Recursos Humanos',
    position: 'Analista de RH',
    salary: 5200,
    startDate: '2021-08-10',
    status: 'active'
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro.costa@login.com.br',
    department: 'Vendas',
    position: 'Consultor Comercial',
    salary: 4800,
    startDate: '2023-01-20',
    status: 'vacation'
  },
  {
    id: '4',
    name: 'Ana Oliveira',
    email: 'ana.oliveira@login.com.br',
    department: 'Financeiro',
    position: 'Analista Financeiro',
    salary: 6000,
    startDate: '2022-11-05',
    status: 'active'
  }
]

const getStatusBadge = (status: Employee['status']) => {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge>
    case 'inactive':
      return <Badge variant="destructive">Inativo</Badge>
    case 'vacation':
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Férias</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

export default function Funcionarios() {
  const [searchTerm, setSearchTerm] = useState("")
  const [employees] = useState<Employee[]>(mockEmployees)

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Funcionários</h1>
          <p className="text-muted-foreground">Gerencie informações dos colaboradores</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Funcionário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">147</div>
            <p className="text-sm text-muted-foreground">Total de Funcionários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">142</div>
            <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">3</div>
            <p className="text-sm text-muted-foreground">Em Férias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">2</div>
            <p className="text-sm text-muted-foreground">Inativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="default">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>R$ {employee.salary.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}