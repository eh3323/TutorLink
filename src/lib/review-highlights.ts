// pull "what people keep saying" out of a tutor's reviews. it's not nlp, just
// a tight list of words/phrases tutees use to praise a tutor. we extract uni-
// and bi-grams, drop stopwords, lowercase, and keep the ones mentioned in at
// least 2 different reviews.

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","on","in","to","for","with","is","was",
  "were","are","be","been","being","i","you","he","she","we","they","my","your",
  "this","that","these","those","at","by","from","it","its","as","not","no",
  "yes","do","does","did","done","have","has","had","so","very","really","just",
  "got","get","gets","one","two","day","night","also","then","than","such",
  "into","over","under","more","most","much","many","like","liked","want",
  "wanted","would","could","should","will","wont","cant","dont","didnt",
  "couldnt","wouldnt","because","why","how","what","when","where","who","whom",
  "him","her","them","us","me","mine","ours","yours","theirs","their","our",
  "his","hers","tutor","session","class","lesson","help","helped","helping",
  "thanks","thank","really","feel","felt","made","make","makes","time","good",
  "great","awesome","nice","amazing","excellent","best","better","ok","okay",
  "nyu","new","york","exam","midterm","final","test","quiz","homework",
  "problem","problems","question","questions","math","cs","stats","econ",
  "physics","chem","chemistry","biology","class","semester",
]);

const KEEP_BIGRAMS = new Set([
  "very patient","super patient","really patient","clear explanation","clear explanations",
  "easy to understand","quick to respond","always prepared","well prepared","step by step",
  "fast response","fast responses","good explanation","good explanations","walked through",
  "walks through","walked me through","saved my grade","passed the exam","got an a",
  "got the a","go to","go-to","life saver","lifesaver",
]);

export type Highlight = {
  label: string;
  count: number;
};

const PUNCT = /[!?.,;:()"'\[\]{}]/g;

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractReviewHighlights(
  reviews: Array<{ comment: string | null }>,
  options: { limit?: number } = {},
): Highlight[] {
  const limit = options.limit ?? 5;
  const counts = new Map<string, Set<number>>();

  reviews.forEach((review, idx) => {
    if (!review.comment) return;
    const text = normalise(review.comment);
    if (!text) return;
    const tokens = text.split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));

    // unigrams that look adjective-y (length ≥4)
    for (const tok of tokens) {
      if (tok.length < 4) continue;
      if (!counts.has(tok)) counts.set(tok, new Set());
      counts.get(tok)!.add(idx);
    }

    // bigrams: only keep curated ones to avoid noise
    for (let i = 0; i < tokens.length - 1; i++) {
      const bg = `${tokens[i]} ${tokens[i + 1]}`;
      if (KEEP_BIGRAMS.has(bg)) {
        if (!counts.has(bg)) counts.set(bg, new Set());
        counts.get(bg)!.add(idx);
      }
    }
  });

  const ranked = [...counts.entries()]
    .map(([label, idxSet]) => ({ label, count: idxSet.size }))
    // word must appear in at least 2 different reviews to count
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count || a.label.length - b.label.length)
    .slice(0, limit)
    .map((entry) => ({ label: entry.label, count: entry.count }));

  return ranked;
}
