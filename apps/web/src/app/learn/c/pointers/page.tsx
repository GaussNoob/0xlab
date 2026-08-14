import { ArrowRight, BookOpen, Braces, Check, ChevronRight, FlaskConical, Lightbulb, MemoryStick } from "lucide-react";
import Link from "next/link";
import { Checkpoint } from "@/components/learning/checkpoint";
import { LessonOutline } from "@/components/learning/lesson-outline";
import { PointerStepLab } from "@/components/learning/pointer-step-lab";
import { CompleteLessonButton } from "@/components/progress/complete-lesson-button";
import { CodeBlock } from "@/components/ui/code-block";

const BASIC_POINTER_CODE = `int x = 10;
int *ptr = &x;

printf("x:   %d\\n", x);
printf("&x:  %p\\n", (void *)&x);
printf("ptr: %p\\n", (void *)ptr);
printf("*ptr: %d\\n", *ptr);`;

export default function PointerLessonPage() {
  return (
    <div className="lesson-layout">
      <article className="lesson-document">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/learn">C Core</Link><ChevronRight size={11} /><span>Ponteiros e indireção</span><ChevronRight size={11} /><strong>03.1</strong>
        </nav>

        <header className="lesson-header">
          <div className="lesson-kicker"><span className="lesson-number">03.1</span><span>Memory model</span><span>36 min</span></div>
          <h1>Ponteiros: endereço<br />e indireção</h1>
          <p>Construa um modelo preciso: um ponteiro é um objeto que armazena um endereço. O operador <code>*</code> permite acessar outro objeto por meio desse endereço.</p>
          <div className="lesson-objectives">
            <span>Ao final você será capaz de</span>
            <ul>
              <li><Check size={12} /> distinguir endereço, valor e objeto apontado;</li>
              <li><Check size={12} /> prever o estado da stack após uma escrita indireta;</li>
              <li><Check size={12} /> imprimir endereços sem invocar comportamento indefinido.</li>
            </ul>
          </div>
        </header>

        <section className="lesson-section" id="mental-model">
          <div className="section-marker"><span>01</span><i /></div>
          <div className="section-content">
            <span className="eyebrow">Modelo mental</span>
            <h2>O ponteiro também ocupa memória</h2>
            <p className="lead">Considere duas coisas separadas: o objeto <code>x</code>, que contém um inteiro, e o objeto <code>ptr</code>, cujo conteúdo é a localização de <code>x</code>.</p>
            <p>O nome de uma variável não existe como etiqueta física na RAM. Em tempo de execução, o programa trabalha com bytes em endereços e com instruções que interpretam esses bytes conforme um tipo. Os nomes ajudam o compilador e o depurador a manter essa relação compreensível.</p>
            <div className="concept-equation" aria-label="Relação entre ponteiro e variável">
              <div><small>objeto</small><strong>ptr</strong></div>
              <span>contém</span>
              <div><small>valor</small><strong>0x7ffe1000</strong></div>
              <span>aponta para</span>
              <div><small>objeto</small><strong>x = 10</strong></div>
            </div>
            <aside className="technical-note">
              <Lightbulb size={16} />
              <div><strong>Endereços do laboratório são didáticos.</strong><p>ASLR, decisões do compilador e o layout do processo fazem os endereços reais variarem entre execuções. A relação entre os objetos é o que importa.</p></div>
            </aside>
          </div>
        </section>

        <section className="lesson-section" id="address">
          <div className="section-marker"><span>02</span><i /></div>
          <div className="section-content">
            <span className="eyebrow">Address-of operator</span>
            <h2><code>&amp;</code> pergunta “onde?”</h2>
            <p>Se <code>x</code> tem tipo <code>int</code>, então <code>&amp;x</code> tem tipo <code>int*</code>. A expressão produz o endereço de <code>x</code>; ela não cria um novo inteiro nem copia seu conteúdo.</p>
            <CodeBlock code={BASIC_POINTER_CODE} filename="address.c" highlightedLines={[1, 2, 6, 7]} />
            <div className="output-strip">
              <span>stdout</span>
              <code>x:   10<br />&amp;x:  0x7ffe1000<br />ptr: 0x7ffe1000<br />*ptr: 10</code>
            </div>
            <p className="fine-print"><strong>Por que o cast para <code>void*</code>?</strong> O especificador <code>%p</code> de <code>printf</code> espera um argumento <code>void*</code>. Essa conversão torna o contrato explícito e portável.</p>
          </div>
        </section>

        <section className="lesson-section" id="dereference">
          <div className="section-marker"><span>03</span><i /></div>
          <div className="section-content">
            <span className="eyebrow">Indirection operator</span>
            <h2><code>*</code> segue o endereço</h2>
            <p>Em uma declaração, <code>*</code> participa da construção do tipo: <code>int *ptr</code>. Em uma expressão, ele faz indireção: <code>*ptr</code> designa o inteiro localizado no endereço guardado em <code>ptr</code>.</p>
            <div className="compare-grid">
              <div><span>declaração</span><code>int *ptr;</code><p>ptr pode guardar o endereço de um <code>int</code>.</p></div>
              <div><span>expressão</span><code>*ptr = 20;</code><p>escreva 20 no <code>int</code> apontado por ptr.</p></div>
            </div>
          </div>
        </section>

        <section className="lesson-section lesson-section-wide" id="visualization">
          <div className="section-marker"><span>04</span><i /></div>
          <div className="section-content">
            <PointerStepLab />
          </div>
        </section>

        <section className="lesson-section" id="checkpoint">
          <div className="section-marker"><span>05</span><i /></div>
          <div className="section-content"><Checkpoint /></div>
        </section>

        <section className="lesson-section" id="internals">
          <div className="section-marker"><span>06</span><i /></div>
          <div className="section-content">
            <span className="eyebrow">Por baixo da abstração</span>
            <h2>O que ocorreu internamente</h2>
            <div className="internals-trace">
              <div><span>01</span><strong>Reserva</strong><p>O frame de <code>main</code> mantém espaço alinhado para <code>x</code> e <code>ptr</code>.</p></div>
              <div><span>02</span><strong>Address calculation</strong><p>Uma instrução como <code>lea</code> pode calcular o endereço de <code>x</code> sem ler seu valor.</p></div>
              <div><span>03</span><strong>Store</strong><p>O endereço é armazenado em <code>ptr</code>. Na escrita indireta, ele é carregado em um registrador.</p></div>
              <div><span>04</span><strong>Indirect write</strong><p>O processador escreve <code>0x00000014</code> nos quatro bytes iniciados naquele endereço.</p></div>
            </div>
            <div className="assembly-peek">
              <div className="assembly-heading"><span>Possível saída x86-64 · -O0</span><small>A forma exata varia por ABI e compilador.</small></div>
              <pre><code><span>lea</span>  rax, [rbp-0x0c]   <i>; &amp;x</i>{"\n"}<span>mov</span>  [rbp-0x08], rax   <i>; ptr = &amp;x</i>{"\n"}<span>mov</span>  rax, [rbp-0x08]   <i>; carrega ptr</i>{"\n"}<span>mov</span>  DWORD PTR [rax], 20 <i>; *ptr = 20</i></code></pre>
            </div>
          </div>
        </section>

        <footer className="lesson-footer">
          <div><span>Próxima lição</span><strong>Ponteiros e arrays</strong><small>Decaimento, indexação e aritmética</small></div>
          <CompleteLessonButton lessonId="pointer-address" />
        </footer>
      </article>
      <LessonOutline />
    </div>
  );
}
