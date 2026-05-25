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
      alocacoes: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          id: number
          membro_id: number
          obra_id: number
          observacao: string | null
          status: Database["public"]["Enums"]["alocacao_status"]
          updated_at: string
          vertical: Database["public"]["Enums"]["origem_desvio"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          id?: number
          membro_id: number
          obra_id: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["alocacao_status"]
          updated_at?: string
          vertical: Database["public"]["Enums"]["origem_desvio"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: number
          membro_id?: number
          obra_id?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["alocacao_status"]
          updated_at?: string
          vertical?: Database["public"]["Enums"]["origem_desvio"]
        }
        Relationships: []
      }
      andares: {
        Row: {
          ativo: number
          created_at: string
          edificio_id: number
          id: number
          nome: string
          numero: number
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: number
          created_at?: string
          edificio_id: number
          id?: number
          nome: string
          numero?: number
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: number
          created_at?: string
          edificio_id?: number
          id?: number
          nome?: string
          numero?: number
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "andares_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_disciplinas: {
        Row: {
          ativo: number
          created_at: string
          id: number
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: number
          created_at?: string
          id?: number
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: number
          created_at?: string
          id?: number
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      checklist_entrega_fotos: {
        Row: {
          created_at: string
          foto_evidencia_id: number | null
          id: number
          item_id: number
          legenda: string | null
          ordem: number
          url: string
        }
        Insert: {
          created_at?: string
          foto_evidencia_id?: number | null
          id?: number
          item_id: number
          legenda?: string | null
          ordem?: number
          url: string
        }
        Update: {
          created_at?: string
          foto_evidencia_id?: number | null
          id?: number
          item_id?: number
          legenda?: string | null
          ordem?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_entrega_fotos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_entrega_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_entrega_itens: {
        Row: {
          avaliacao: Database["public"]["Enums"]["checklist_avaliacao"]
          comentarios: string | null
          created_at: string
          disciplina_id: number | null
          disciplina_nome: string
          entrega_id: number
          equipe_nome: string | null
          fornecedor_id: number | null
          fornecedor_nome: string | null
          id: number
          ordem: number
        }
        Insert: {
          avaliacao?: Database["public"]["Enums"]["checklist_avaliacao"]
          comentarios?: string | null
          created_at?: string
          disciplina_id?: number | null
          disciplina_nome: string
          entrega_id: number
          equipe_nome?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          id?: number
          ordem?: number
        }
        Update: {
          avaliacao?: Database["public"]["Enums"]["checklist_avaliacao"]
          comentarios?: string | null
          created_at?: string
          disciplina_id?: number | null
          disciplina_nome?: string
          entrega_id?: number
          equipe_nome?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          id?: number
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_entrega_itens_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "checklist_entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_entregas: {
        Row: {
          condicao: Database["public"]["Enums"]["checklist_condicao"]
          created_at: string
          created_by_id: string | null
          created_by_name: string | null
          data_vistoria: number
          gc: string | null
          go: string | null
          id: number
          metragem_m2: number | null
          obra_id: number
          total_itens: number
          updated_at: string
        }
        Insert: {
          condicao?: Database["public"]["Enums"]["checklist_condicao"]
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_vistoria: number
          gc?: string | null
          go?: string | null
          id?: number
          metragem_m2?: number | null
          obra_id: number
          total_itens?: number
          updated_at?: string
        }
        Update: {
          condicao?: Database["public"]["Enums"]["checklist_condicao"]
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_vistoria?: number
          gc?: string | null
          go?: string | null
          id?: number
          metragem_m2?: number | null
          obra_id?: number
          total_itens?: number
          updated_at?: string
        }
        Relationships: []
      }
      checklist_fornecedor_equipe: {
        Row: {
          created_at: string
          disciplina: string | null
          fornecedor_id: number | null
          fornecedor_nome: string
          id: number
          nome_equipe: string
        }
        Insert: {
          created_at?: string
          disciplina?: string | null
          fornecedor_id?: number | null
          fornecedor_nome: string
          id?: number
          nome_equipe: string
        }
        Update: {
          created_at?: string
          disciplina?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string
          id?: number
          nome_equipe?: string
        }
        Relationships: []
      }
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
          categoria: string
          cor: string
          id: number
          maximo: number
          minimo: number
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          categoria?: string
          cor: string
          id?: number
          maximo: number
          minimo: number
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
          categoria?: string
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
      desvio_aprovacoes: {
        Row: {
          aprovador_id: string
          aprovador_nome: string | null
          comentario: string | null
          created_at: string
          decisao: Database["public"]["Enums"]["decisao_aprovacao"]
          desvio_id: number
          id: number
          tipo: Database["public"]["Enums"]["tipo_aprovacao"]
        }
        Insert: {
          aprovador_id: string
          aprovador_nome?: string | null
          comentario?: string | null
          created_at?: string
          decisao: Database["public"]["Enums"]["decisao_aprovacao"]
          desvio_id: number
          id?: number
          tipo: Database["public"]["Enums"]["tipo_aprovacao"]
        }
        Update: {
          aprovador_id?: string
          aprovador_nome?: string | null
          comentario?: string | null
          created_at?: string
          decisao?: Database["public"]["Enums"]["decisao_aprovacao"]
          desvio_id?: number
          id?: number
          tipo?: Database["public"]["Enums"]["tipo_aprovacao"]
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
          deleted_at: string | null
          deleted_by_id: string | null
          deleted_by_name: string | null
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
          tag_solicitado_arquitetura: number
          tag_solicitado_cliente: number
          tag_solicitado_gerenciadora: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_fechamento?: number | null
          data_identificacao: number
          deleted_at?: string | null
          deleted_by_id?: string | null
          deleted_by_name?: string | null
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
          tag_solicitado_arquitetura?: number
          tag_solicitado_cliente?: number
          tag_solicitado_gerenciadora?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_fechamento?: number | null
          data_identificacao?: number
          deleted_at?: string | null
          deleted_by_id?: string | null
          deleted_by_name?: string | null
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
          tag_solicitado_arquitetura?: number
          tag_solicitado_cliente?: number
          tag_solicitado_gerenciadora?: number
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
      disciplinas: {
        Row: {
          created_at: string
          id: number
          id_disciplina: number
          id_grupo: number
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_disciplina: number
          id_grupo: number
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          id_disciplina?: number
          id_grupo?: number
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_id_grupo_fkey"
            columns: ["id_grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      edificios: {
        Row: {
          ativo: number
          codigo: string | null
          created_at: string
          id: number
          nome: string
          obra_id: number
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: number
          codigo?: string | null
          created_at?: string
          id?: number
          nome: string
          obra_id: number
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: number
          codigo?: string | null
          created_at?: string
          id?: number
          nome?: string
          obra_id?: number
          ordem?: number
          updated_at?: string
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          cobertura_vistoria: number
          codigo: string
          created_at: string
          data_atualizacao: string | null
          data_criacao: string | null
          endereco: string | null
          id: number
          id_projeto: number | null
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
          cobertura_vistoria?: number
          codigo: string
          created_at?: string
          data_atualizacao?: string | null
          data_criacao?: string | null
          endereco?: string | null
          id?: number
          id_projeto?: number | null
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
          cobertura_vistoria?: number
          codigo?: string
          created_at?: string
          data_atualizacao?: string | null
          data_criacao?: string | null
          endereco?: string | null
          id?: number
          id_projeto?: number | null
          marcacao?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["status_obra"]
          updated_at?: string
        }
        Relationships: []
      }
      ocorrencia_causas: {
        Row: {
          categoria:
            | Database["public"]["Enums"]["categoria_causa_ocorrencia"]
            | null
          created_at: string
          descricao: string
          id: number
          ocorrencia_id: number
          tipo: Database["public"]["Enums"]["tipo_causa_ocorrencia"]
        }
        Insert: {
          categoria?:
            | Database["public"]["Enums"]["categoria_causa_ocorrencia"]
            | null
          created_at?: string
          descricao: string
          id?: number
          ocorrencia_id: number
          tipo: Database["public"]["Enums"]["tipo_causa_ocorrencia"]
        }
        Update: {
          categoria?:
            | Database["public"]["Enums"]["categoria_causa_ocorrencia"]
            | null
          created_at?: string
          descricao?: string
          id?: number
          ocorrencia_id?: number
          tipo?: Database["public"]["Enums"]["tipo_causa_ocorrencia"]
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_causas_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_comissao: {
        Row: {
          contato: string | null
          created_at: string
          id: number
          is_coordenador: number
          nome: string
          ocorrencia_id: number
          papel: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string
          id?: number
          is_coordenador?: number
          nome: string
          ocorrencia_id: number
          papel?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string
          id?: number
          is_coordenador?: number
          nome?: string
          ocorrencia_id?: number
          papel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_comissao_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_cronologia: {
        Row: {
          created_at: string
          descricao: string
          etapa: string
          id: number
          momento: string | null
          ocorrencia_id: number
          ordem: number
        }
        Insert: {
          created_at?: string
          descricao: string
          etapa: string
          id?: number
          momento?: string | null
          ocorrencia_id: number
          ordem?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          etapa?: string
          id?: number
          momento?: string | null
          ocorrencia_id?: number
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_cronologia_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_documentos: {
        Row: {
          created_at: string
          descricao: string | null
          file_key: string
          id: number
          ocorrencia_id: number
          tipo: Database["public"]["Enums"]["tipo_doc_ocorrencia"]
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          file_key: string
          id?: number
          ocorrencia_id: number
          tipo?: Database["public"]["Enums"]["tipo_doc_ocorrencia"]
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          file_key?: string
          id?: number
          ocorrencia_id?: number
          tipo?: Database["public"]["Enums"]["tipo_doc_ocorrencia"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_documentos_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          etapa: Database["public"]["Enums"]["etapa_foto_ocorrencia"]
          file_key: string
          id: number
          ocorrencia_id: number
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          etapa?: Database["public"]["Enums"]["etapa_foto_ocorrencia"]
          file_key: string
          id?: number
          ocorrencia_id: number
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          etapa?: Database["public"]["Enums"]["etapa_foto_ocorrencia"]
          file_key?: string
          id?: number
          ocorrencia_id?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_fotos_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_porques: {
        Row: {
          created_at: string
          id: number
          nivel: number
          ocorrencia_id: number
          ordem: number
          parent_id: number | null
          pergunta: string | null
          resposta: string
        }
        Insert: {
          created_at?: string
          id?: number
          nivel?: number
          ocorrencia_id: number
          ordem?: number
          parent_id?: number | null
          pergunta?: string | null
          resposta: string
        }
        Update: {
          created_at?: string
          id?: number
          nivel?: number
          ocorrencia_id?: number
          ordem?: number
          parent_id?: number | null
          pergunta?: string | null
          resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_porques_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_porques_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ocorrencia_porques"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_testemunhas: {
        Row: {
          contato: string | null
          created_at: string
          depoimento: string | null
          id: number
          identidade: string | null
          nome: string
          ocorrencia_id: number
        }
        Insert: {
          contato?: string | null
          created_at?: string
          depoimento?: string | null
          id?: number
          identidade?: string | null
          nome: string
          ocorrencia_id: number
        }
        Update: {
          contato?: string | null
          created_at?: string
          depoimento?: string | null
          id?: number
          identidade?: string | null
          nome?: string
          ocorrencia_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_testemunhas_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          acao_imediata: string | null
          acidentado_funcao: string | null
          acidentado_idade: number | null
          acidentado_nome: string | null
          atestado_dias: number | null
          awfor149_anexada: number
          cat_emitida: number
          cat_numero: string | null
          cidade: string | null
          classificacao: Database["public"]["Enums"]["classificacao_ocorrencia"]
          cnpj_principal: string | null
          cnpj_subcontratada: string | null
          created_at: string
          created_by_id: string | null
          created_by_name: string | null
          data_fechamento: number | null
          data_ocorrencia: number
          descricao_preliminar: string
          empresa_principal: string | null
          empresa_subcontratada: string | null
          endereco: string | null
          hora: string | null
          id: number
          local_ocorrencia: string | null
          obra_id: number
          observacoes: string | null
          prazo_comissao: number | null
          prazo_investigacao: number | null
          prazo_plano: number | null
          responsavel_obra: string | null
          responsavel_preenchimento: string | null
          status: Database["public"]["Enums"]["status_ocorrencia"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          acao_imediata?: string | null
          acidentado_funcao?: string | null
          acidentado_idade?: number | null
          acidentado_nome?: string | null
          atestado_dias?: number | null
          awfor149_anexada?: number
          cat_emitida?: number
          cat_numero?: string | null
          cidade?: string | null
          classificacao: Database["public"]["Enums"]["classificacao_ocorrencia"]
          cnpj_principal?: string | null
          cnpj_subcontratada?: string | null
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_fechamento?: number | null
          data_ocorrencia: number
          descricao_preliminar: string
          empresa_principal?: string | null
          empresa_subcontratada?: string | null
          endereco?: string | null
          hora?: string | null
          id?: number
          local_ocorrencia?: string | null
          obra_id: number
          observacoes?: string | null
          prazo_comissao?: number | null
          prazo_investigacao?: number | null
          prazo_plano?: number | null
          responsavel_obra?: string | null
          responsavel_preenchimento?: string | null
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          acao_imediata?: string | null
          acidentado_funcao?: string | null
          acidentado_idade?: number | null
          acidentado_nome?: string | null
          atestado_dias?: number | null
          awfor149_anexada?: number
          cat_emitida?: number
          cat_numero?: string | null
          cidade?: string | null
          classificacao?: Database["public"]["Enums"]["classificacao_ocorrencia"]
          cnpj_principal?: string | null
          cnpj_subcontratada?: string | null
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          data_fechamento?: number | null
          data_ocorrencia?: number
          descricao_preliminar?: string
          empresa_principal?: string | null
          empresa_subcontratada?: string | null
          endereco?: string | null
          hora?: string | null
          id?: number
          local_ocorrencia?: string | null
          obra_id?: number
          observacoes?: string | null
          prazo_comissao?: number | null
          prazo_investigacao?: number | null
          prazo_plano?: number | null
          responsavel_obra?: string | null
          responsavel_preenchimento?: string | null
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plano_categorias: {
        Row: {
          ativo: number
          created_at: string
          id: number
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: number
          created_at?: string
          id?: number
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: number
          created_at?: string
          id?: number
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      plano_desvios: {
        Row: {
          created_at: string
          desvio_id: number
          id: number
          plano_id: number
        }
        Insert: {
          created_at?: string
          desvio_id: number
          id?: number
          plano_id: number
        }
        Update: {
          created_at?: string
          desvio_id?: number
          id?: number
          plano_id?: number
        }
        Relationships: []
      }
      planos_acao: {
        Row: {
          acao: string
          alerta_atraso_enviado: number
          categoria_id: number | null
          created_at: string
          desvio_id: number | null
          id: number
          lembrete_enviado: number
          notificado_em: number | null
          obra_id: number | null
          observacoes: string | null
          ocorrencia_id: number | null
          prazo: number
          prioridade: Database["public"]["Enums"]["prioridade_plano"]
          responsavel: string
          responsavel_email: string | null
          responsavel_id: number | null
          responsavel_tipo: Database["public"]["Enums"]["responsavel_tipo"]
          status: Database["public"]["Enums"]["status_plano"]
          tipo: Database["public"]["Enums"]["tipo_plano"]
          updated_at: string
          vertical: Database["public"]["Enums"]["origem_desvio"] | null
        }
        Insert: {
          acao: string
          alerta_atraso_enviado?: number
          categoria_id?: number | null
          created_at?: string
          desvio_id?: number | null
          id?: number
          lembrete_enviado?: number
          notificado_em?: number | null
          obra_id?: number | null
          observacoes?: string | null
          ocorrencia_id?: number | null
          prazo: number
          prioridade?: Database["public"]["Enums"]["prioridade_plano"]
          responsavel: string
          responsavel_email?: string | null
          responsavel_id?: number | null
          responsavel_tipo?: Database["public"]["Enums"]["responsavel_tipo"]
          status?: Database["public"]["Enums"]["status_plano"]
          tipo?: Database["public"]["Enums"]["tipo_plano"]
          updated_at?: string
          vertical?: Database["public"]["Enums"]["origem_desvio"] | null
        }
        Update: {
          acao?: string
          alerta_atraso_enviado?: number
          categoria_id?: number | null
          created_at?: string
          desvio_id?: number | null
          id?: number
          lembrete_enviado?: number
          notificado_em?: number | null
          obra_id?: number | null
          observacoes?: string | null
          ocorrencia_id?: number | null
          prazo?: number
          prioridade?: Database["public"]["Enums"]["prioridade_plano"]
          responsavel?: string
          responsavel_email?: string | null
          responsavel_id?: number | null
          responsavel_tipo?: Database["public"]["Enums"]["responsavel_tipo"]
          status?: Database["public"]["Enums"]["status_plano"]
          tipo?: Database["public"]["Enums"]["tipo_plano"]
          updated_at?: string
          vertical?: Database["public"]["Enums"]["origem_desvio"] | null
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
      planta_ambientes: {
        Row: {
          ativo: number
          created_at: string
          id: number
          nome: string
          numero: string | null
          origem: string
          pavimento: string | null
          pin_x: number | null
          pin_y: number | null
          planta_id: number
          revisado: number
          updated_at: string
        }
        Insert: {
          ativo?: number
          created_at?: string
          id?: number
          nome: string
          numero?: string | null
          origem?: string
          pavimento?: string | null
          pin_x?: number | null
          pin_y?: number | null
          planta_id: number
          revisado?: number
          updated_at?: string
        }
        Update: {
          ativo?: number
          created_at?: string
          id?: number
          nome?: string
          numero?: string | null
          origem?: string
          pavimento?: string | null
          pin_x?: number | null
          pin_y?: number | null
          planta_id?: number
          revisado?: number
          updated_at?: string
        }
        Relationships: []
      }
      plantas: {
        Row: {
          andar_id: number | null
          created_at: string
          extracao_at: string | null
          extracao_erro: string | null
          extracao_status: string
          file_key: string
          id: number
          nome: string
          obra_id: number
          ordem: number
          updated_at: string
          url: string
        }
        Insert: {
          andar_id?: number | null
          created_at?: string
          extracao_at?: string | null
          extracao_erro?: string | null
          extracao_status?: string
          file_key: string
          id?: number
          nome: string
          obra_id: number
          ordem?: number
          updated_at?: string
          url: string
        }
        Update: {
          andar_id?: number | null
          created_at?: string
          extracao_at?: string | null
          extracao_erro?: string | null
          extracao_status?: string
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
            foreignKeyName: "plantas_andar_id_fkey"
            columns: ["andar_id"]
            isOneToOne: false
            referencedRelation: "andares"
            referencedColumns: ["id"]
          },
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
      verificacao_resposta_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          file_key: string
          id: number
          item_id: number
          url: string
          verificacao_id: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          file_key: string
          id?: number
          item_id: number
          url: string
          verificacao_id: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          file_key?: string
          id?: number
          item_id?: number
          url?: string
          verificacao_id?: number
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
          categoria: string
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
          categoria?: string
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
          categoria?: string
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
      alocacao_status: "pendente" | "cumprido" | "cancelado"
      app_role:
        | "admin"
        | "user"
        | "aprovador_gerenciadora"
        | "aprovador_arquitetura"
      cargo_membro:
        | "avaliador"
        | "gerente_obra"
        | "gerente_contrato"
        | "nucleo"
        | "diretoria"
        | "coordenador"
        | "tecnico"
      categoria_causa_ocorrencia:
        | "ato_abaixo_padrao"
        | "condicao_abaixo_padrao"
        | "fator_pessoal"
        | "fator_trabalho"
      checklist_avaliacao: "ok" | "atencao" | "critico"
      checklist_condicao: "ruim" | "regular" | "otima"
      classificacao_ocorrencia:
        | "incidente"
        | "incidente_ambiental"
        | "aca"
        | "asa"
        | "af"
        | "at"
      decisao_aprovacao: "aprovado" | "reprovado"
      etapa_foto_ocorrencia: "cena" | "simulacao" | "evidencia" | "plano"
      origem_desvio: "qualidade" | "checklist" | "qsms" | "vistoria"
      prioridade_plano: "urgente" | "normal" | "baixa"
      referencia_tipo: "desvio" | "plano" | "verificacao"
      responsavel_tipo: "membro" | "fornecedor"
      resposta_verificacao: "AT" | "NAT" | "GR" | "NA"
      severidade_desvio: "leve" | "moderado" | "grave"
      status_desvio: "aberto" | "em_andamento" | "fechado" | "aguardando_aceite"
      status_obra: "ativa" | "concluida" | "pausada"
      status_ocorrencia:
        | "comunicado"
        | "em_investigacao"
        | "em_analise"
        | "acao_em_andamento"
        | "encerrado"
      status_plano: "pendente" | "em_andamento" | "concluido"
      tipo_aprovacao: "gerenciadora" | "arquitetura"
      tipo_causa_ocorrencia: "imediata" | "basica"
      tipo_doc_ocorrencia:
        | "cat"
        | "atestado"
        | "awfor149"
        | "memorando"
        | "outro"
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
      tipo_plano: "corretivo" | "preventivo"
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
      alocacao_status: ["pendente", "cumprido", "cancelado"],
      app_role: [
        "admin",
        "user",
        "aprovador_gerenciadora",
        "aprovador_arquitetura",
      ],
      cargo_membro: [
        "avaliador",
        "gerente_obra",
        "gerente_contrato",
        "nucleo",
        "diretoria",
        "coordenador",
        "tecnico",
      ],
      categoria_causa_ocorrencia: [
        "ato_abaixo_padrao",
        "condicao_abaixo_padrao",
        "fator_pessoal",
        "fator_trabalho",
      ],
      checklist_avaliacao: ["ok", "atencao", "critico"],
      checklist_condicao: ["ruim", "regular", "otima"],
      classificacao_ocorrencia: [
        "incidente",
        "incidente_ambiental",
        "aca",
        "asa",
        "af",
        "at",
      ],
      decisao_aprovacao: ["aprovado", "reprovado"],
      etapa_foto_ocorrencia: ["cena", "simulacao", "evidencia", "plano"],
      origem_desvio: ["qualidade", "checklist", "qsms", "vistoria"],
      prioridade_plano: ["urgente", "normal", "baixa"],
      referencia_tipo: ["desvio", "plano", "verificacao"],
      responsavel_tipo: ["membro", "fornecedor"],
      resposta_verificacao: ["AT", "NAT", "GR", "NA"],
      severidade_desvio: ["leve", "moderado", "grave"],
      status_desvio: ["aberto", "em_andamento", "fechado", "aguardando_aceite"],
      status_obra: ["ativa", "concluida", "pausada"],
      status_ocorrencia: [
        "comunicado",
        "em_investigacao",
        "em_analise",
        "acao_em_andamento",
        "encerrado",
      ],
      status_plano: ["pendente", "em_andamento", "concluido"],
      tipo_aprovacao: ["gerenciadora", "arquitetura"],
      tipo_causa_ocorrencia: ["imediata", "basica"],
      tipo_doc_ocorrencia: [
        "cat",
        "atestado",
        "awfor149",
        "memorando",
        "outro",
      ],
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
      tipo_plano: ["corretivo", "preventivo"],
    },
  },
} as const
