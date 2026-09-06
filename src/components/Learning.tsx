import { useState } from "react";
import { BookOpen, ArrowUpRight, Check } from "lucide-react";
import { LESSONS } from "../content/lessons.ts";
import { QUESTIONS } from "../content/questions.ts";
import type { Lesson } from "../content/lessons.ts";
import type { Question } from "../content/questions.ts";
import { Panel } from "./Primitives.tsx";

export function QuestionCard({
  question: q,
  answer,
  onAnswer,
}: {
  question: Question;
  answer: number | undefined;
  onAnswer: (n: number) => void;
}) {
  return (
    <div className="question-card">
      <span className="eyebrow">
        LEVEL {q.level} ·{" "}
        {q.level === 1 ? "TEMEL KAVRAM" : q.level === 2 ? "SİSTEM İLİŞKİSİ" : "ARIZA MUHAKEMESİ"}
      </span>
      <h3>{q.prompt}</h3>
      <div className="answer-options">
        {q.options.map((option, i) => (
          <button
            key={option}
            disabled={answer !== undefined}
            className={
              answer !== undefined
                ? i === q.correct
                  ? "correct"
                  : i === answer
                    ? "incorrect"
                    : ""
                : ""
            }
            aria-pressed={answer === i}
            onClick={() => onAnswer(i)}
          >
            <span>{String.fromCharCode(65 + i)}</span>
            {option}
            {answer !== undefined && i === q.correct && <Check size={17} />}
          </button>
        ))}
      </div>
      {answer !== undefined && (
        <div
          className={`answer-explanation ${answer === q.correct ? "correct" : "incorrect"}`}
          role="status"
        >
          <strong>
            {answer === q.correct
              ? "Doğru."
              : "Doğru yanıt: " + String.fromCharCode(65 + q.correct)}
          </strong>
          <p>{q.explanation}</p>
        </div>
      )}
    </div>
  );
}

export function Learning({ onExperiment }: { onExperiment: (lesson: Lesson) => void }) {
  const [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<number, number>>({});
  const lesson = LESSONS[index],
    questions = QUESTIONS.filter((q) => q.topic === index + 1).slice(0, 3);
  const count = LESSONS.filter((_, i) =>
    QUESTIONS.filter((q) => q.topic === i + 1)
      .slice(0, 3)
      .every((q) => answers[q.id] !== undefined),
  ).length;
  return (
    <div className="learning-layout">
      <aside className="curriculum">
        <span className="eyebrow">HEE 305 / ÖĞRENME ROTASI</span>
        <h2>
          15 adımda
          <br />
          yakıt sistemi.
        </h2>
        <p>{count} / 15 bölüm değerlendirildi</p>
        <progress max={15} value={count} />
        <nav aria-label="Ders bölümleri">
          {LESSONS.map((l, i) => (
            <button
              key={l.title}
              className={index === i ? "active" : ""}
              onClick={() => setIndex(i)}
              aria-current={index === i ? "step" : undefined}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span>
                {l.title}
                <small>{l.english}</small>
              </span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="lesson-content">
        <span className="eyebrow">
          BÖLÜM {String(index + 1).padStart(2, "0")} / 15 · {lesson.english.toUpperCase()}
        </span>
        <h1>{lesson.title}</h1>
        <div className="learning-flow">
          <span>Öğren</span>→<span>Gör</span>→<span>Değiştir</span>→<span>Yorumla</span>→
          <span>Mini quiz</span>
        </div>
        <Panel title="Kavramı yakala" action={<BookOpen size={20} />}>
          <div className="prose">
            <p className="lead">{lesson.concept}</p>
            <h3>Gerçek sistemdeki görevi</h3>
            <p>{lesson.role}</p>
          </div>
        </Panel>
        <Panel title="Sistemde dene" eyebrow="GÖR → DEĞİŞTİR → DENEY YAP">
          <div className="prose">
            <ol className="experiment-steps">
              {lesson.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <button className="primary" onClick={() => onExperiment(lesson)}>
              Canlı şemada deneyi aç <ArrowUpRight size={17} />
            </button>
            <p className="footnote">
              İlgili parça vurgulanır ve bu deneyin başlangıç durumu yüklenir. Mini quiz yanıtların
              bu sekmede korunur.
            </p>
            <details>
              <summary>Beklenen sonucu yorumla</summary>
              <p>{lesson.interpretation}</p>
            </details>
          </div>
        </Panel>
        <Panel title="Kendini kontrol et" eyebrow="3 KISA SORU">
          <div className="mini-quiz">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answer={answers[q.id]}
                onAnswer={(n) => setAnswers({ ...answers, [q.id]: n })}
              />
            ))}
          </div>
        </Panel>
        <div className="pagination">
          <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Önceki bölüm
          </button>
          <span>{index + 1} / 15</span>
          <button disabled={index === 14} onClick={() => setIndex(index + 1)}>
            Sonraki bölüm →
          </button>
        </div>
      </div>
    </div>
  );
}

export function Exam() {
  const [answers, setAnswers] = useState<Record<number, number>>({}),
    [index, setIndex] = useState(0),
    [level, setLevel] = useState(0),
    [finished, setFinished] = useState(false);
  const questions = QUESTIONS.filter((q) => level === 0 || q.level === level),
    q = questions[index] ?? questions[0];
  const correct = QUESTIONS.filter((q) => answers[q.id] === q.correct).length,
    answered = Object.keys(answers).length;
  const wrong = QUESTIONS.filter((q) => answers[q.id] !== undefined && answers[q.id] !== q.correct);
  return (
    <div className="exam-layout">
      <div>
        <span className="eyebrow">FINAL EXAMINATION / 60 ÖZGÜN SORU</span>
        <h1>
          Ezberden <br />
          sistem muhakemesine.
        </h1>
        <p>Part-66 style educational practice questions.</p>
        <p className="muted">
          Resmî Part-66 soru bankası değildir. Her soru bir kez puanlanır; açıklamalar seçimden
          sonra görünür.
        </p>
        <div className="exam-score">
          <strong data-testid="exam-score">
            {correct}
            <small>/60</small>
          </strong>
          <span>
            DOĞRU YANIT
            <br />
            {answered} soru yanıtlandı
          </span>
        </div>
        <progress max={60} value={answered} />
        <div className="question-map" aria-label="Soru haritası">
          {QUESTIONS.map((question, i) => (
            <button
              key={question.id}
              aria-label={`Soru ${i + 1}`}
              className={`${question.id === q.id ? "current" : ""} ${answers[question.id] !== undefined ? (answers[question.id] === question.correct ? "correct" : "incorrect") : ""}`}
              onClick={() => {
                setLevel(0);
                setIndex(i);
                setFinished(false);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button className="wide" onClick={() => setFinished(true)}>
          Sonuçları değerlendir
        </button>
        <button
          className="text-button"
          onClick={() => {
            setAnswers({});
            setIndex(0);
            setLevel(0);
            setFinished(false);
          }}
        >
          Yeni sınav başlat
        </button>
      </div>
      <Panel
        title={finished ? "Sınav değerlendirmesi" : `Soru ${q.id} / 60`}
        eyebrow={finished ? "ÖĞRENME GERİ BİLDİRİMİ" : "TEKNİK KONTROL"}
      >
        <div className="exam-main">
          {finished ? (
            <>
              <h2>
                {correct} doğru · {wrong.length} yanlış · {60 - answered} boş
              </h2>
              <p>
                Puan: <b>{Math.round((correct / 60) * 100)} / 100</b>. Boş sorular doğru sayılmaz.
              </p>
              <div className="level-summary">
                {[1, 2, 3].map((l) => (
                  <p key={l}>
                    LEVEL {l}
                    <b>
                      {QUESTIONS.filter((q) => q.level === l && answers[q.id] === q.correct).length}{" "}
                      / {QUESTIONS.filter((q) => q.level === l).length}
                    </b>
                  </p>
                ))}
              </div>
              {wrong.length > 0 ? (
                <>
                  <h3>Tekrar etmen gereken konular</h3>
                  {[...new Set(wrong.map((q) => q.topic))].map((t) => (
                    <p key={t}>
                      {String(t).padStart(2, "0")} · {LESSONS[t - 1].title}
                    </p>
                  ))}
                  {wrong.map((q) => (
                    <details key={q.id}>
                      <summary>
                        {q.id}. {q.prompt}
                      </summary>
                      <p>
                        <b>{q.options[q.correct]}</b>
                      </p>
                      <p>{q.explanation}</p>
                    </details>
                  ))}
                </>
              ) : (
                <p>
                  {answered === 60
                    ? "Bütün sorular doğru yanıtlandı. Görev modunda konfigürasyonları deneyebilirsin."
                    : "Henüz yanlış yanıtın yok; boş soruları tamamlayabilirsin."}
                </p>
              )}
              <button className="primary" onClick={() => setFinished(false)}>
                Sorulara dön
              </button>
            </>
          ) : (
            <>
              <div className="choice-row" aria-label="Soru seviyesi">
                {[0, 1, 2, 3].map((l) => (
                  <button
                    key={l}
                    aria-pressed={l === level}
                    onClick={() => {
                      setLevel(l);
                      setIndex(0);
                    }}
                  >
                    {l === 0 ? "Tümü" : `LEVEL ${l}`}
                  </button>
                ))}
              </div>
              <QuestionCard
                question={q}
                answer={answers[q.id]}
                onAnswer={(n) => setAnswers({ ...answers, [q.id]: n })}
              />
              <div className="pagination">
                <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  ← Önceki soru
                </button>
                <span>
                  {index + 1} / {questions.length}
                </span>
                <button
                  disabled={index === questions.length - 1}
                  onClick={() => setIndex(index + 1)}
                >
                  Sonraki soru →
                </button>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
