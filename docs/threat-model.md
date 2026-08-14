# Threat model do executor

## Ativos

- host e socket do Docker;
- processo web e banco de progresso;
- outros jobs em execução;
- disponibilidade da máquina;
- segredos de ambiente.

## Atacante assumido

Todo código submetido é hostil: pode fazer fork bomb, alocar memória indefinidamente, produzir saída ilimitada, tentar rede, ler filesystem, explorar syscalls ou abusar do compilador.

## Controles implementados

- serviço runner separado e não exposto publicamente;
- autenticação interna por token;
- validação de payload, extensão, nome, quantidade e tamanho de arquivos;
- compiladores e flags em allowlist;
- `--network none`, root filesystem read-only e diretório temporário por job;
- usuário numérico sem privilégios, `--cap-drop ALL` e `no-new-privileges`;
- limites de CPU, RAM, PIDs, arquivos abertos, tamanho de arquivos e saída;
- timeout externo no runner e timeout interno no container;
- remoção do container e do diretório temporário em `finally`;
- nenhum segredo do runner é enviado ao container do job.

## Riscos residuais

Montar o socket Docker no runner concede grande poder ao próprio serviço runner. Em uma implantação pública, use workers dedicados em VMs descartáveis, gVisor/Kata/Firecracker, fila durável, imagens assinadas e política seccomp/AppArmor específica. O Compose fornecido é adequado para laboratório pessoal, não para exposição pública sem hardening adicional.

