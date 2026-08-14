#!/usr/bin/env bash
set -uo pipefail

compiler="${1:?compiler is required}"
shift

flags=()
while (($#)); do
  if [[ "$1" == "--" ]]; then
    shift
    break
  fi
  flags+=("$1")
  shift
done
sources=("$@")

case "$compiler" in
  gcc|g++|clang|clang++) ;;
  *) printf '%s\n' "unsupported compiler" > /workspace/compile.stderr; printf '2' > /workspace/compile.exit; exit 2 ;;
esac

ulimit -c 0
ulimit -f 2048
ulimit -n 64

set +e
timeout --signal=KILL 7s "$compiler" "${flags[@]}" "${sources[@]}" -o /workspace/program \
  > /workspace/compile.stdout 2> /workspace/compile.stderr
compile_status=$?
printf '%s' "$compile_status" > /workspace/compile.exit

if ((compile_status != 0)); then
  exit "$compile_status"
fi

# These files are derived from the binary that was just produced in this
# disposable workspace. They are compiler artifacts, not a runtime trace.
objdump --disassemble --source --line-numbers --wide --demangle -Mintel /workspace/program \
  > /workspace/disassembly.txt 2>/dev/null || true
readelf --sections --wide /workspace/program \
  > /workspace/sections.txt 2>/dev/null || true

oom_before="$(awk '$1 == "oom_kill" { print $2 }' /sys/fs/cgroup/memory.events 2>/dev/null || printf '0')"
run_started="$(date +%s)"
timeout --signal=TERM --kill-after=1s 5s /workspace/program \
  < /workspace/stdin.txt > /workspace/run.stdout 2> /workspace/run.stderr
run_status=$?
run_finished="$(date +%s)"
oom_after="$(awk '$1 == "oom_kill" { print $2 }' /sys/fs/cgroup/memory.events 2>/dev/null || printf '0')"

if ((oom_after > oom_before)); then
  printf '1' > /workspace/run.oom
elif ((run_status == 124 || (run_status == 137 && run_finished - run_started >= 5))); then
  printf '1' > /workspace/run.timeout
fi

printf '%s' "$run_status" > /workspace/run.exit
exit "$run_status"
