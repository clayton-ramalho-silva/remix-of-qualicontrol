export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checklist_itens: {
        Row: {
          ativo: number
          codigo: string
          created_at: string
          descricao: string
          id: number
          ordem: number
          secao_id: number
          updated_at: string
        }
        Insert: {
          ativo?: number
          codigo: string
          created_at?: string
          descricao: string
          id?: number
          ordem: number
          secao_id: number
          updated_at?: string
        }
        Update: {
          ativo?: number
          codigo?: string
          created_at?: string
          descricao?: string
          id?: number
          ordem?: number
          secao_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_itens_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "checklist_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_secoes: {
        Row: {
          ativo: number
          categoria: string
          created_at: string
          id: number
          numero: number
          ordem: number
          peso: number
          reincidencia: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: number
          categoria?: string
          created_at?: string
          id?: number
          numero: number
          ordem: number
          peso?: number
          reincidencia?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: number
          categoria?: string
          created_at?: string
          id?: number
          numero?: number
          ordem?: number
          peso?: number
          reincidencia?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_faixas: {
        Row: {
          cor: string
          id: number
          maximo: number
          minimo: number
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          cor: string
          id?: number
          maximo: number
          minimo: number
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
          cor?: string
          id?: number
          maximo?: number
          minimo?: number
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      desvios: {
        Row: {
          created_at: string
          created_by_id: string | null
          created_by_name: string | null
          data_fechamento: number | null
          data_identificacao: number
          descricao: string
          disciplina: string | null
          fornecedor_id: number | null
          fornecedor_nome: string | null
          grupo_id: number | null
          id: number
          localizacao: string | null
          obra_id: number
          origem: Database["public"]["Enums"]["origem_desvio"]
          pin_x: number | null
          pin_y: number | null
          planta_id: number | null
          prazo_sugerido: number | null
          severidade: Database["public"]["Enums"]["severidade_desvio"]
          status: Database["public"]["Enums"]["status_desvio"]
          tag_critico: number
          tag_seguranca_trabalho: number
          tag_solicitado_cliente: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_fechamento?: number | null
          data_identificacao: number
          descricao: string
          disciplina?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          grupo_id?: number | null
          id?: number
          localizacao?: string | null
          obra_id: number
          origem?: Database["public"]["Enums"]["origem_desvio"]
          pin_x?: number | null
          pin_y?: number | null
          planta_id?: number | null
          prazo_sugerido?: number | null
          severidade: Database["public"]["Enums"]["severidade_desvio"]
          status?: Database["public"]["Enums"]["status_desvio"]
          tag_critico?: number
          tag_seguranca_trabalho?: number
          tag_solicitado_cliente?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_fechamento?: number | null
          data_identificacao?: number
          descricao?: string
          disciplina?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          grupo_id?: number | null
          id?: number
          localizacao?: string | null
          obra_id?: number
          origem?: Database["public"]["Enums"]["origem_desvio"]
          pin_x?: number | null
          pin_y?: number | null
          planta_id?: number | null
          prazo_sugerido?: number | null
          severidade?: Database["public"]["Enums"]["severidade_desvio"]
          status?: Database["public"]["Enums"]["status_desvio"]
          tag_critico?: number
          tag_seguranca_trabalho?: number
          tag_solicitado_cliente?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "desvios_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desvios_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desvios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desvios_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          contato: string | null
          created_at: string
          disciplina: string | null
          email: string | null
          id: number
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          contato?: string | null
          created_at?: string
          disciplina?: string | null
          email?: string | null
          id?: number
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          contato?: string | null
          created_at?: string
          disciplina?: string | null
          email?: string | null
          id?: number
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fotos_evidencia: {
        Row: {
          created_at: string
          descricao: string | null
          desvio_id: number
          file_key: string
          id: number
          tipo: Database["public"]["Enums"]["tipo_foto"]
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          desvio_id: number
          file_key: string
          id?: number
          tipo?: Database["public"]["Enums"]["tipo_foto"]
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          desvio_id?: number
          file_key?: string
          id?: number
          tipo?: Database["public"]["Enums"]["tipo_foto"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_evidencia_desvio_id_fkey"
            columns: ["desvio_id"]
            isOneToOne: false
            referencedRelation: "desvios"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          ativo: number
          codigo: string
          created_at: string
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: number
          codigo: string
          created_at?: string
          id?: number
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: number
          codigo?: string
          created_at?: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      historico: {
        Row: {
          created_at: string
          de: string | null
          descricao: string
          desvio_id: number
          id: number
          para: string | null
          tipo: Database["public"]["Enums"]["tipo_historico"]
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          de?: string | null
          descricao: string
          desvio_id: number
          id?: number
          para?: string | null
          tipo: Database["public"]["Enums"]["tipo_historico"]
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          de?: string | null
          descricao?: string
          desvio_id?: number
          id?: number
          para?: string | null
          tipo?: Database["public"]["Enums"]["tipo_historico"]
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_desvio_id_fkey"
            columns: ["desvio_id"]
            isOneToOne: false
            referencedRelation: "desvios"
            referencedColumns: ["id"]
          },
        ]
      }
      membros_equipe: {
        Row: {
          ativo: number
          cargo: Database["public"]["Enums"]["cargo_membro"]
          created_at: string
          email: string | null
          id: number
          nome: string
          obra_ids: Json | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: number
          cargo: Database["public"]["Enums"]["cargo_membro"]
          created_at?: string
          email?: string | null
          id?: number
          nome: string
          obra_ids?: Json | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: number
          cargo?: Database["public"]["Enums"]["cargo_membro"]
          created_at?: string
          email?: string | null
          id?: number
          nome?: string
          obra_ids?: Json | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: number
          lida: number
          mensagem: string
          referencia_id: number | null
          referencia_tipo: Database["public"]["Enums"]["referencia_tipo"] | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          lida?: number
          mensagem: string
          referencia_id?: number | null
          referencia_tipo?:
            | Database["public"]["Enums"]["referencia_tipo"]
            | null
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          lida?: number
          mensagem?: string
          referencia_id?: number | null
          referencia_tipo?:
            | Database["public"]["Enums"]["referencia_tipo"]
            | null
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          cliente: string | null
          cobertura: number
          cobertura_checklist: number
          cobertura_qsms: number
          cobertura_qualidade: number
          codigo: string
          created_at: string
          endereco: string | null
          id: number
          marcacao: string | null
          nome: string
          status: Database["public"]["Enums"]["status_obra"]
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          cobertura?: number
          cobertura_checklist?: number
          cobertura_qsms?: number
          cobertura_qualidade?: number
          codigo: string
          created_at?: string
          endereco?: string | null
          id?: number
          marcacao?: string | null
          nome: string
          status?: Database["public"]["Enums"]["status_obra"]
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          cobertura?: number
          cobertura_checklist?: number
          cobertura_qsms?: number
          cobertura_qualidade?: number
          codigo?: string
          created_at?: string
          endereco?: string | null
          id?: number
          marcacao?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["status_obra"]
          updated_at?: string
        }
        Relationships: []
      }
      planos_acao: {
        Row: {
          acao: string
          alerta_atraso_enviado: number
          created_at: string
          desvio_id: number
          id: number
          lembrete_enviado: number
          notificado_em: number | null
          observacoes: string | null
          prazo: number
          prioridade: Database["public"]["Enums"]["prioridade_plano"]
          responsavel: string
          responsavel_email: string | null
          responsavel_id: number | null
          responsavel_tipo: Database["public"]["Enums"]["responsavel_tipo"]
          status: Database["public"]["Enums"]["status_plano"]
          updated_at: string
        }
        Insert: {
          acao: string
          alerta_atraso_enviado?: number
          created_at?: string
          desvio_id: number
          id?: number
          lembrete_enviado?: number
          notificado_em?: number | null
          observacoes?: string | null
          prazo: number
          prioridade?: Database["public"]["Enums"]["prioridade_plano"]
          responsavel: string
          responsavel_email?: string | null
          responsavel_id?: number | null
          responsavel_tipo?: Database["public"]["Enums"]["responsavel_tipo"]
          status?: Database["public"]["Enums"]["status_plano"]
          updated_at?: string
        }
        Update: {
          acao?: string
          alerta_atraso_enviado?: number
          created_at?: string
          desvio_id?: number
          id?: number
          lembrete_enviado?: number
          notificado_em?: number | null
          observacoes?: string | null
          prazo?: number
          prioridade?: Database["public"]["Enums"]["prioridade_plano"]
          responsavel?: string
          responsavel_email?: string | null
          responsavel_id?: number | null
          responsavel_tipo?: Database["public"]["Enums"]["responsavel_tipo"]
          status?: Database["public"]["Enums"]["status_plano"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_acao_desvio_id_fkey"
            columns: ["desvio_id"]
            isOneToOne: false
            referencedRelation: "desvios"
            referencedColumns: ["id"]
          },
        ]
      }
      plantas: {
        Row: {
          created_at: string
          file_key: string
          id: number
          nome: string
          obra_id: number
          ordem: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          file_key: string
          id?: number
          nome: string
          obra_id: number
          ordem?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          file_key?: string
          id?: number
          nome?: string
          obra_id?: number
          ordem?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verificacao_respostas: {
        Row: {
          created_at: string
          id: number
          item_id: number
          observacao: string | null
          resposta: Database["public"]["Enums"]["resposta_verificacao"]
          verificacao_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          item_id: number
          observacao?: string | null
          resposta: Database["public"]["Enums"]["resposta_verificacao"]
          verificacao_id: number
        }
        Update: {
          created_at?: string
          id?: number
          item_id?: number
          observacao?: string | null
          resposta?: Database["public"]["Enums"]["resposta_verificacao"]
          verificacao_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "verificacao_respostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verificacao_respostas_verificacao_id_fkey"
            columns: ["verificacao_id"]
            isOneToOne: false
            referencedRelation: "verificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacoes: {
        Row: {
          avaliador: string
          created_at: string
          data_vistoria: number
          diretoria: string | null
          gc: string | null
          go: string | null
          id: number
          nucleo: string | null
          obra_id: number
          observacoes: string | null
          score_condicao: number | null
          score_cronograma: number | null
          score_geral: number | null
          score_qualidade: number | null
          status_condicao: string | null
          status_cronograma: string | null
          status_geral: string | null
          status_qualidade: string | null
          updated_at: string
        }
        Insert: {
          avaliador: string
          created_at?: string
          data_vistoria: number
          diretoria?: string | null
          gc?: string | null
          go?: string | null
          id?: number
          nucleo?: string | null
          obra_id: number
          observacoes?: string | null
          score_condicao?: number | null
          score_cronograma?: number | null
          score_geral?: number | null
          score_qualidade?: number | null
          status_condicao?: string | null
          status_cronograma?: string | null
          status_geral?: string | null
          status_qualidade?: string | null
          updated_at?: string
        }
        Update: {
          avaliador?: string
          created_at?: string
          data_vistoria?: number
          diretoria?: string | null
          gc?: string | null
          go?: string | null
          id?: number
          nucleo?: string | null
          obra_id?: number
          observacoes?: string | null
          score_condicao?: number | null
          score_cronograma?: number | null
          score_geral?: number | null
          score_qualidade?: number | null
          status_condicao?: string | null
          status_cronograma?: string | null
          status_geral?: string | null
          status_qualidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verificacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      cargo_membro:
        | "avaliador"
        | "gerente_obra"
        | "gerente_contrato"
        | "nucleo"
        | "diretoria"
        | "coordenador"
        | "tecnico"
      origem_desvio: "qualidade" | "checklist" | "qsms"
      prioridade_plano: "urgente" | "normal" | "baixa"
      referencia_tipo: "desvio" | "plano" | "verificacao"
      responsavel_tipo: "membro" | "fornecedor"
      resposta_verificacao: "AT" | "NAT" | "GR" | "NA"
      severidade_desvio: "leve" | "moderado" | "grave"
      status_desvio: "aberto" | "em_andamento" | "fechado" | "aguardando_aceite"
      status_obra: "ativa" | "concluida" | "pausada"
      status_plano: "pendente" | "em_andamento" | "concluido"
      tipo_foto: "abertura" | "fechamento"
      tipo_historico:
        | "criacao"
        | "status"
        | "edicao"
        | "plano_acao"
        | "comentario"
        | "foto"
      tipo_notificacao:
        | "plano_criado"
        | "prazo_vencendo"
        | "plano_atrasado"
        | "status_alterado"
        | "verificacao"
        | "geral"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      cargo_membro: [
        "avaliador",
        "gerente_obra",
        "gerente_contrato",
        "nucleo",
        "diretoria",
        "coordenador",
        "tecnico",
      ],
      origem_desvio: ["qualidade", "checklist", "qsms"],
      prioridade_plano: ["urgente", "normal", "baixa"],
      referencia_tipo: ["desvio", "plano", "verificacao"],
      responsavel_tipo: ["membro", "fornecedor"],
      resposta_verificacao: ["AT", "NAT", "GR", "NA"],
      severidade_desvio: ["leve", "moderado", "grave"],
      status_desvio: ["aberto", "em_andamento", "fechado", "aguardando_aceite"],
      status_obra: ["ativa", "concluida", "pausada"],
      status_plano: ["pendente", "em_andamento", "concluido"],
      tipo_foto: ["abertura", "fechamento"],
      tipo_historico: [
        "criacao",
        "status",
        "edicao",
        "plano_acao",
        "comentario",
        "foto",
      ],
      tipo_notificacao: [
        "plano_criado",
        "prazo_vencendo",
        "plano_atrasado",
        "status_alterado",
        "verificacao",
        "geral",
      ],
    },
  },
} as const
