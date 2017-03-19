# why?

the old connector (`accelo-powerbi`) has too much complexity,
technical debt, and it doesn't meet requirements.


# nifty

Get realtime, colored, filtered, readable output from a bunyan logfile:

```bash
tail -f logs/all.log | bunyan -c 'this.level >= WARN' --color | less -R +F
```
