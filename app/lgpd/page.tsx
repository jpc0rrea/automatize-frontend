import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | AutomatizeJá",
  description:
    "Política de Privacidade e conformidade com a LGPD (Lei Geral de Proteção de Dados) do AutomatizeJá.",
};

export default function LGPDPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>

        <article className="prose prose-zinc dark:prose-invert max-w-none">
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Política de Privacidade
          </h1>

          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>

          <section className="mt-8">
            <h2>1. Introdução</h2>
            <p>
              A <strong>AutomatizeJá</strong> (&quot;nós&quot;,
              &quot;nosso&quot; ou &quot;Empresa&quot;) está comprometida em
              proteger a privacidade e os dados pessoais de nossos usuários, em
              conformidade com a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018 - LGPD).
            </p>
            <p>
              Esta Política de Privacidade descreve como coletamos, usamos,
              armazenamos e protegemos suas informações pessoais quando você
              utiliza nossa plataforma.
            </p>
          </section>

          <section className="mt-8">
            <h2>2. Dados que Coletamos</h2>
            <p>Podemos coletar os seguintes tipos de dados pessoais:</p>
            <ul>
              <li>
                <strong>Dados de identificação:</strong> nome, e-mail e foto de
                perfil (obtidos através do login com Google)
              </li>
              <li>
                <strong>Dados de conta do Instagram:</strong> nome de usuário,
                ID da conta e informações públicas do perfil (quando você
                conecta sua conta do Instagram)
              </li>
              <li>
                <strong>Dados de uso:</strong> informações sobre como você
                interage com nossa plataforma
              </li>
              <li>
                <strong>Dados da empresa:</strong> informações sobre sua marca,
                identidade visual e preferências de comunicação
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>3. Finalidade do Tratamento</h2>
            <p>Utilizamos seus dados pessoais para:</p>
            <ul>
              <li>Fornecer e melhorar nossos serviços de automação</li>
              <li>
                Personalizar sua experiência na plataforma com base na
                identidade da sua marca
              </li>
              <li>
                Gerar conteúdo e respostas automatizadas para o Instagram
              </li>
              <li>
                Comunicar atualizações importantes sobre o serviço
              </li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>4. Base Legal para o Tratamento</h2>
            <p>
              O tratamento dos seus dados pessoais é realizado com base nas
              seguintes hipóteses legais previstas na LGPD:
            </p>
            <ul>
              <li>
                <strong>Consentimento:</strong> quando você autoriza
                expressamente o tratamento dos seus dados
              </li>
              <li>
                <strong>Execução de contrato:</strong> para prestação dos
                serviços contratados
              </li>
              <li>
                <strong>Legítimo interesse:</strong> para melhorar nossos
                serviços e sua experiência
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>5. Compartilhamento de Dados</h2>
            <p>
              Seus dados pessoais podem ser compartilhados com:
            </p>
            <ul>
              <li>
                <strong>Meta/Instagram:</strong> para integração com a API do
                Instagram e funcionamento dos serviços de automação
              </li>
              <li>
                <strong>Provedores de serviços:</strong> empresas que nos
                auxiliam na operação da plataforma (hospedagem, análise de
                dados)
              </li>
              <li>
                <strong>Autoridades competentes:</strong> quando exigido por lei
                ou ordem judicial
              </li>
            </ul>
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com
              terceiros para fins de marketing sem seu consentimento expresso.
            </p>
          </section>

          <section className="mt-8">
            <h2>6. Seus Direitos</h2>
            <p>
              De acordo com a LGPD, você possui os seguintes direitos em relação
              aos seus dados pessoais:
            </p>
            <ul>
              <li>
                <strong>Confirmação e acesso:</strong> saber se tratamos seus
                dados e ter acesso a eles
              </li>
              <li>
                <strong>Correção:</strong> solicitar a correção de dados
                incompletos, inexatos ou desatualizados
              </li>
              <li>
                <strong>Anonimização, bloqueio ou eliminação:</strong> de dados
                desnecessários ou tratados em desconformidade
              </li>
              <li>
                <strong>Portabilidade:</strong> transferir seus dados para outro
                fornecedor de serviço
              </li>
              <li>
                <strong>Eliminação:</strong> solicitar a exclusão dos dados
                tratados com base no consentimento
              </li>
              <li>
                <strong>Revogação do consentimento:</strong> retirar o
                consentimento a qualquer momento
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>7. Segurança dos Dados</h2>
            <p>
              Implementamos medidas técnicas e organizacionais apropriadas para
              proteger seus dados pessoais contra acesso não autorizado,
              alteração, divulgação ou destruição, incluindo:
            </p>
            <ul>
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controle de acesso baseado em funções</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>8. Retenção de Dados</h2>
            <p>
              Seus dados pessoais serão mantidos apenas pelo tempo necessário
              para cumprir as finalidades para as quais foram coletados, ou
              conforme exigido por lei. Após esse período, os dados serão
              eliminados ou anonimizados.
            </p>
          </section>

          <section className="mt-8">
            <h2>9. Cookies e Tecnologias Similares</h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar sua
              experiência, analisar o uso da plataforma e fornecer
              funcionalidades essenciais. Você pode gerenciar suas preferências
              de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="mt-8">
            <h2>10. Alterações nesta Política</h2>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente.
              Notificaremos você sobre alterações significativas através da
              plataforma ou por e-mail. Recomendamos revisar esta página
              regularmente.
            </p>
          </section>

          <section className="mt-8">
            <h2>11. Contato</h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre esta
              Política de Privacidade, entre em contato conosco:
            </p>
            <ul>
              <li>
                <strong>E-mail:</strong>{" "}
                <a
                  href="mailto:privacidade@automatizeja.com"
                  className="text-primary hover:underline"
                >
                  privacidade@automatizeja.com
                </a>
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>12. Encarregado de Proteção de Dados (DPO)</h2>
            <p>
              Para questões relacionadas à proteção de dados pessoais, você pode
              entrar em contato com nosso Encarregado de Proteção de Dados
              através do e-mail acima.
            </p>
          </section>
        </article>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-muted-foreground text-sm">
            © {new Date().getFullYear()} AutomatizeJá. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
