# The launch email

The launch film (`brand/film/`) told again for the inbox: `index.html` is the
email (and its "view in your browser" page, `mulvium.org/email/launch/`), and
`launch.txt` its plain-text part.

- **Subject:** Millions of people have ideas for things that should exist
- **Preview text:** Watch the film. (set in the email's hidden first line)
- **From:** Benjamin, Mulvium · reply to hello@mulvium.org

Its pictures are cut from the film itself, without its words (the film page's
`?clean`), so the email's own type carries them: the wordmark turning through
its faces (`mark.gif`), the cosmos (`hero.gif`, with a play button) and
the cosmos tilting up into view (`cosmos.gif`), the sphere of the organization's work (`work.gif`), the Fiscal
Sponsorship bowl filling (`bowl.gif`) and the network of institutions
(`net.gif`). Each is under a megabyte; `make.sh` makes them again.

The film itself plays inline in Apple Mail and iOS Mail (`poster.jpg` is its
first frame); every other client shows `hero.gif`, linked to the film's page.
Outlook on Windows shows each GIF's first frame, so every first frame is a
picture in its own right, and its button is drawn in VML.

Before sending, through the sending service:

- replace `{{unsubscribe_url}}` and `{{postal_address}}` (in both parts);
- send a test to Apple Mail, Gmail and Outlook (or through Litmus or Email
  on Acid) to see the film inline and its stand-in.

All images load from `https://mulvium.org/email/launch/`, so the email works
once this folder is live on the site.
